import { Router } from "express";
import {
  bulkSave,
  listAttendance,
  updateAttendance,
} from "../controllers/attendanceController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  bulkAttendanceSchema,
  listAttendanceQuery,
  updateAttendanceSchema,
} from "../validators/attendance.js";

const router = Router();
router.use(authenticate);

router.post("/bulk", validate(bulkAttendanceSchema), bulkSave);
router.get("/", validate(listAttendanceQuery, "query"), listAttendance);
router.put("/:id", validate(updateAttendanceSchema), updateAttendance);

export default router;
