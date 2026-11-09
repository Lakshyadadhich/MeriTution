import { Router } from "express";
import * as exportsController from "../controllers/exportsController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { exportQuery } from "../validators/reports.js";

const router = Router();
router.use(authenticate);

router.get("/students.xlsx", validate(exportQuery, "query"), exportsController.students);
router.get("/fees.xlsx", validate(exportQuery, "query"), exportsController.fees);
router.get("/payments.xlsx", validate(exportQuery, "query"), exportsController.payments);
router.get(
  "/attendance.xlsx",
  validate(exportQuery, "query"),
  exportsController.attendance
);

export default router;
