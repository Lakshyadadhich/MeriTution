import { asyncHandler } from "../utils/asyncHandler.js";
import {
  attendanceReport,
  collectionReport,
  dashboard,
  feesReport,
} from "../services/reportService.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await dashboard({ feeMonth: req.validatedQuery.feeMonth });
  res.json(data);
});

export const getFeesReport = asyncHandler(async (req, res) => {
  const data = await feesReport(req.validatedQuery);
  res.json(data);
});

export const getOutstandingReport = asyncHandler(async (req, res) => {
  const data = await feesReport(req.validatedQuery);
  const items = data.items.filter((item) => item.balanceAmount > 0);
  const summary = {
    count: items.length,
    totalDue: 0,
    collected: 0,
    outstanding: 0,
  };
  for (const item of items) {
    summary.totalDue += item.totalDue;
    summary.collected += item.amountPaid;
    summary.outstanding += item.balanceAmount;
  }
  res.json({ ...data, summary, items });
});

export const getAttendanceReport = asyncHandler(async (req, res) => {
  const data = await attendanceReport(req.validatedQuery);
  res.json(data);
});

export const getCollectionReport = asyncHandler(async (req, res) => {
  const { month, from, to } = req.validatedQuery;
  const data = await collectionReport({ month, from, to });
  res.json(data);
});
