import { Router } from "express";
import {
  createPayment,
  listPayments,
  reverse,
} from "../controllers/paymentsController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createPaymentSchema,
  listPaymentsQuery,
  reversePaymentSchema,
} from "../validators/fees.js";

const router = Router();
router.use(authenticate);

router.post("/", validate(createPaymentSchema), createPayment);
router.get("/", validate(listPaymentsQuery, "query"), listPayments);
router.post("/:id/reverse", validate(reversePaymentSchema), reverse);

export default router;
