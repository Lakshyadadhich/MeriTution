import FeeRecord from "../models/FeeRecord.js";
import Payment from "../models/Payment.js";
import Student from "../models/Student.js";
import ApiError from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";
import { nextReceiptNumber } from "../utils/codes.js";
import { todayInTz } from "../utils/dates.js";
import { formatInr } from "../utils/money.js";
import { runInTransaction } from "../utils/transaction.js";
import { recalculateFeeRecord } from "./feeService.js";

export async function recordPayment(payload, user) {
  const {
    studentId,
    feeRecordId,
    amount,
    paymentDate,
    paymentMode,
    transactionReference,
    notes,
  } = payload;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw ApiError.badRequest("Payment amount must be greater than zero");
  }

  const result = await runInTransaction(async (session) => {
    const fee = await FeeRecord.findById(feeRecordId).session(session);
    if (!fee) throw ApiError.notFound("Fee record not found");

    if (fee.studentId.toString() !== studentId) {
      throw ApiError.badRequest("Fee record does not belong to the selected student");
    }

    const student = await Student.findById(studentId).session(session);
    if (!student) throw ApiError.notFound("Student not found");

    if (amount > fee.balanceAmount) {
      throw ApiError.unprocessable(
        `Payment exceeds the outstanding balance of ${formatInr(fee.balanceAmount)}. Overpayments and advances are not supported.`
      );
    }

    const receiptNumber = await nextReceiptNumber();
    const [payment] = await Payment.create(
      [
        {
          receiptNumber,
          studentId,
          feeRecordId,
          amount,
          paymentDate: paymentDate
            ? new Date(`${paymentDate}T00:00:00Z`)
            : new Date(`${todayInTz()}T00:00:00Z`),
          paymentMode,
          transactionReference: transactionReference || null,
          notes: notes || null,
          status: "completed",
        },
      ],
      { session }
    );

    fee.amountPaid += amount;
    fee.balanceAmount = fee.totalDue - fee.amountPaid;
    fee.status = FeeRecord.deriveStatus(fee.amountPaid, fee.balanceAmount);
    await fee.save({ session });

    return { payment, fee };
  });

  await audit("payment.record", {
    entityType: "Payment",
    entityId: result.payment._id,
    performedBy: user?._id,
    details: {
      receiptNumber: result.payment.receiptNumber,
      amount: result.payment.amount,
      studentId,
      feeRecordId,
    },
  });

  return result;
}

export async function reversePayment(paymentId, reason, user) {
  const result = await runInTransaction(async (session) => {
    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) throw ApiError.notFound("Payment not found");
    if (payment.status === "reversed") {
      throw ApiError.conflict("This payment has already been reversed");
    }

    payment.status = "reversed";
    payment.reversalReason = reason;
    payment.reversedAt = new Date();
    await payment.save({ session });

    const fee = await recalculateFeeRecord(payment.feeRecordId, session);
    return { payment, fee };
  });

  await audit("payment.reverse", {
    entityType: "Payment",
    entityId: result.payment._id,
    performedBy: user?._id,
    details: {
      receiptNumber: result.payment.receiptNumber,
      amount: result.payment.amount,
      reason,
    },
  });

  return result;
}
