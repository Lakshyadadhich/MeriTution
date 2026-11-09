import Batch from "../models/Batch.js";
import Student from "../models/Student.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { pagedResult } from "../utils/pagination.js";

export const createBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.create({
    name: req.body.name,
    grades: req.body.grades || [],
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    daysOfWeek: req.body.daysOfWeek || [],
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
  });
  res.status(201).json({ batch });
});

export const listBatches = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.validatedQuery;
  const filter = {};
  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;

  const pagination = { page, limit, skip: (page - 1) * limit };
  const [batches, total] = await Promise.all([
    Batch.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    Batch.countDocuments(filter),
  ]);

  const ids = batches.map((b) => b._id);
  const counts = await Student.aggregate([
    { $match: { "tuitionInfo.batchId": { $in: ids }, status: "active" } },
    { $group: { _id: "$tuitionInfo.batchId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
  const items = batches.map((b) => ({
    ...b,
    studentCount: countMap.get(b._id.toString()) || 0,
  }));

  res.json(pagedResult(items, total, pagination));
});

export const getBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id).lean();
  if (!batch) throw ApiError.notFound("Batch not found");

  const students = await Student.find({
    "tuitionInfo.batchId": batch._id,
    status: "active",
  })
    .select("studentCode personalInfo.fullName parentInfo.primaryContact academicInfo.grade tuitionInfo.monthlyFee")
    .sort({ "personalInfo.fullName": 1 })
    .lean();

  res.json({ batch, students });
});

export const updateBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id);
  if (!batch) throw ApiError.notFound("Batch not found");

  for (const key of ["name", "grades", "startTime", "endTime", "daysOfWeek", "isActive"]) {
    if (req.body[key] !== undefined) batch[key] = req.body[key];
  }
  await batch.save();
  res.json({ batch });
});
