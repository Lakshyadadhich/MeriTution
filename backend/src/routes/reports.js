import { Router } from "express";
import {
  getAttendanceReport,
  getCollectionReport,
  getDashboard,
  getFeesReport,
  getOutstandingReport,
} from "../controllers/reportsController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { reportsQuery } from "../validators/reports.js";

const router = Router();
router.use(authenticate);

router.get("/dashboard", validate(reportsQuery, "query"), getDashboard);
router.get("/fees", validate(reportsQuery, "query"), getFeesReport);
router.get("/outstanding", validate(reportsQuery, "query"), getOutstandingReport);
router.get("/attendance", validate(reportsQuery, "query"), getAttendanceReport);
router.get("/collection", validate(reportsQuery, "query"), getCollectionReport);

export default router;
