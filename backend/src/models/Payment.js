import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    feeRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeRecord",
      required: true,
    },
    amount: { type: Number, required: true, min: 1 },
    paymentDate: { type: Date, required: true },
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "bank_transfer", "other"],
      required: true,
    },
    transactionReference: { type: String, default: null, trim: true },
    notes: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ["completed", "reversed"],
      default: "completed",
      index: true,
    },
    reversalReason: { type: String, default: null },
    reversedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ studentId: 1, paymentDate: -1 });
paymentSchema.index({ feeRecordId: 1, status: 1 });
paymentSchema.index({ paymentDate: -1 });

export default mongoose.model("Payment", paymentSchema);
