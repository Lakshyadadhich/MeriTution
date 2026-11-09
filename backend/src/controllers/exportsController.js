import { asyncHandler } from "../utils/asyncHandler.js";
import {
  exportAttendance,
  exportFees,
  exportPayments,
  exportStudents,
} from "../services/exportService.js";

function sendWorkbook(res, { buffer, filename }) {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
}

export const students = asyncHandler(async (req, res) => {
  sendWorkbook(res, await exportStudents(req.validatedQuery));
});

export const fees = asyncHandler(async (req, res) => {
  sendWorkbook(res, await exportFees(req.validatedQuery));
});

export const payments = asyncHandler(async (req, res) => {
  sendWorkbook(res, await exportPayments(req.validatedQuery));
});

export const attendance = asyncHandler(async (req, res) => {
  sendWorkbook(res, await exportAttendance(req.validatedQuery));
});
