import { Router } from "express";
import {
  generateFees,
  getFee,
  getStudentFees,
  listFees,
  updateFee,
} from "../controllers/feesController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  generateFeesSchema,
  listFeesQuery,
  updateFeeSchema,
} from "../validators/fees.js";

const router = Router();
router.use(authenticate);

router.post("/generate", validate(generateFeesSchema), generateFees);
router.get("/", validate(listFeesQuery, "query"), listFees);
router.get("/student/:studentId", getStudentFees);
router.get("/:id", getFee);
router.put("/:id", validate(updateFeeSchema), updateFee);

export default router;
