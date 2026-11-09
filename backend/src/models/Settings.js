import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    tuitionName: { type: String, default: "My Tuition Classes", trim: true },
    currency: { type: String, default: "INR", enum: ["INR"] },
    timezone: { type: String, default: "Asia/Kolkata" },
    academicYear: { type: String, required: true },
    feeGenerationDay: { type: Number, default: 1, min: 1, max: 28 },
    defaultDueDay: { type: Number, default: 5, min: 1, max: 31 },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);
