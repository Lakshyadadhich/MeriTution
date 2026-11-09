import mongoose from "mongoose";

const feeRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    feeMonth: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    baseAmount: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    totalDue: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
      index: true,
    },
  },
  { timestamps: true }
);

feeRecordSchema.index({ studentId: 1, feeMonth: 1 }, { unique: true });
feeRecordSchema.index({ feeMonth: 1, status: 1 });

feeRecordSchema.statics.deriveStatus = function deriveStatus(amountPaid, balanceAmount) {
  if (amountPaid <= 0) return "unpaid";
  if (balanceAmount <= 0) return "paid";
  return "partial";
};

export default mongoose.model("FeeRecord", feeRecordSchema);
