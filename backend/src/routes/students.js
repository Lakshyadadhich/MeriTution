import { Router } from "express";
import {
  checkDuplicate,
  createStudent,
  getStudent,
  listStudents,
  setStudentStatus,
  updateStudent,
} from "../controllers/studentsController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createStudentSchema,
  listStudentsQuery,
  studentStatusSchema,
  updateStudentSchema,
} from "../validators/students.js";

const router = Router();
router.use(authenticate);

router.post("/", validate(createStudentSchema), createStudent);
router.get("/", validate(listStudentsQuery, "query"), listStudents);
router.get("/check-duplicate", checkDuplicate);
router.get("/:id", getStudent);
router.put("/:id", validate(updateStudentSchema), updateStudent);
router.patch("/:id/status", validate(studentStatusSchema), setStudentStatus);

export default router;
