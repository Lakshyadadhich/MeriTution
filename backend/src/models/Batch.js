import mongoose from "mongoose";
import { GRADES } from "./Student.js";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const batchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    grades: {
      type: [{ type: String, enum: GRADES }],
      default: [],
    },
    startTime: {
      type: String,
      required: true,
      validate: { validator: (v) => timeRegex.test(v), message: "startTime must be HH:mm" },
    },
    endTime: {
      type: String,
      required: true,
      validate: { validator: (v) => timeRegex.test(v), message: "endTime must be HH:mm" },
    },
    daysOfWeek: {
      type: [{ type: Number, min: 0, max: 6 }],
      default: [],
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

batchSchema.index({ name: 1 });

export default mongoose.model("Batch", batchSchema);
