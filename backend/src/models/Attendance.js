import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    attendanceDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    status: {
      type: String,
      enum: ["present", "absent", "leave"],
      required: true,
    },
    remarks: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

attendanceSchema.index(
  { studentId: 1, batchId: 1, attendanceDate: 1 },
  { unique: true }
);
attendanceSchema.index({ attendanceDate: 1, batchId: 1 });

export default mongoose.model("Attendance", attendanceSchema);
