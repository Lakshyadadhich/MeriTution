import mongoose from "mongoose";

const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const studentSchema = new mongoose.Schema(
  {
    studentCode: { type: String, required: true, unique: true },
    personalInfo: {
      fullName: { type: String, required: true, trim: true },
      dob: { type: Date, default: null },
      gender: {
        type: String,
        enum: ["male", "female", "other", null],
        default: null,
      },
      photoUrl: { type: String, default: null },
    },
    parentInfo: {
      fatherName: { type: String, default: null, trim: true },
      motherName: { type: String, default: null, trim: true },
      primaryContact: { type: String, required: true, trim: true },
      alternateContact: { type: String, default: null, trim: true },
    },
    academicInfo: {
      schoolName: { type: String, default: null, trim: true },
      grade: { type: String, enum: GRADES, required: true },
      academicYear: { type: String, required: true },
      subjects: { type: [String], default: [] },
    },
    tuitionInfo: {
      batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
        default: null,
      },
      monthlyFee: { type: Number, required: true, min: 0 },
      dueDay: { type: Number, required: true, min: 1, max: 31 },
      joiningDate: { type: Date, required: true },
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

studentSchema.index({ "personalInfo.fullName": 1 });
studentSchema.index({ "parentInfo.primaryContact": 1 });
studentSchema.index({ "academicInfo.grade": 1 });
studentSchema.index({ "tuitionInfo.batchId": 1 });

studentSchema.virtual("batch", {
  ref: "Batch",
  localField: "tuitionInfo.batchId",
  foreignField: "_id",
  justOne: true,
});

studentSchema.set("toJSON", { virtuals: true });
studentSchema.set("toObject", { virtuals: true });

export { GRADES };
export default mongoose.model("Student", studentSchema);
