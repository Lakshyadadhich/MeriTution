import FeeRecord from "../models/FeeRecord.js";
import Payment from "../models/Payment.js";
import Student from "../models/Student.js";
import ApiError from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";
import { currentMonthInTz, dueDateForMonth } from "../utils/dates.js";
import { formatInr } from "../utils/money.js";
import { getSettings } from "./settingsService.js";

export async function recalculateFeeRecord(feeRecordId, session = null) {
  const fee = await FeeRecord.findById(feeRecordId).session(session);
  if (!fee) throw ApiError.notFound("Fee record not found");

  const payments = await Payment.find({
    feeRecordId: fee._id,
    status: "completed",
  }).session(session);

  const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceAmount = Math.max(fee.totalDue - amountPaid, 0);

  fee.amountPaid = amountPaid;
  fee.balanceAmount = balanceAmount;
  fee.status = FeeRecord.deriveStatus(amountPaid, balanceAmount);
  await fee.save({ session });
  return fee;
}

export async function generateMonthlyFees({ feeMonth, dueDay, studentIds }, user) {
  const settings = await getSettings();
  const month = feeMonth || currentMonthInTz();
  const effectiveDueDay = dueDay || settings.defaultDueDay || 5;

  const query = { status: "active" };
  if (studentIds?.length) query._id = { $in: studentIds };

  const students = await Student.find(query).lean();
  let created = 0;
  let skipped = 0;

  for (const student of students) {
    const totalDue = Math.max(
      student.tuitionInfo.monthlyFee - 0,
      0
    );
    try {
      const result = await FeeRecord.updateOne(
        { studentId: student._id, feeMonth: month },
        {
          $setOnInsert: {
            baseAmount: student.tuitionInfo.monthlyFee,
            discountAmount: 0,
            totalDue,
            dueDate: dueDateForMonth(month, student.tuitionInfo.dueDay || effectiveDueDay),
            amountPaid: 0,
            balanceAmount: totalDue,
            status: totalDue === 0 ? "paid" : "unpaid",
          },
        },
        { upsert: true }
      );
      if (result.upsertedCount > 0) created += 1;
      else skipped += 1;
    } catch (error) {
      if (error?.code === 11000) {
        skipped += 1;
      } else {
        throw error;
      }
    }
  }

  await audit("fees.generate", {
    entityType: "FeeRecord",
    performedBy: user?._id,
    details: { feeMonth: month, created, skipped, students: students.length },
  });

  return {
    feeMonth: month,
    dueDay: effectiveDueDay,
    studentsProcessed: students.length,
    created,
    skipped,
  };
}

export async function updateFeeRecord(id, payload, user) {
  const fee = await FeeRecord.findById(id);
  if (!fee) throw ApiError.notFound("Fee record not found");

  if (payload.baseAmount !== undefined) {
    if (fee.amountPaid > 0) {
      throw ApiError.unprocessable(
        "Base amount cannot be changed after a payment has been recorded. Record a discount instead."
      );
    }
    fee.baseAmount = payload.baseAmount;
  }

  if (payload.discountAmount !== undefined) {
    fee.discountAmount = payload.discountAmount;
  }

  const newTotal = fee.baseAmount - fee.discountAmount;
  if (newTotal < 0) {
    throw ApiError.badRequest("Discount cannot exceed the base amount");
  }
  if (newTotal < fee.amountPaid) {
    throw ApiError.unprocessable(
      `Total due cannot be less than the amount already paid (${formatInr(fee.amountPaid)})`
    );
  }

  fee.totalDue = newTotal;
  fee.balanceAmount = newTotal - fee.amountPaid;
  fee.status = FeeRecord.deriveStatus(fee.amountPaid, fee.balanceAmount);

  if (payload.dueDate) {
    fee.dueDate = new Date(`${payload.dueDate}T00:00:00Z`);
  }

  await fee.save();

  await audit("fees.adjust", {
    entityType: "FeeRecord",
    entityId: fee._id,
    performedBy: user?._id,
    details: {
      baseAmount: fee.baseAmount,
      discountAmount: fee.discountAmount,
      totalDue: fee.totalDue,
    },
  });

  return fee;
}
