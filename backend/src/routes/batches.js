import { Router } from "express";
import {
  createBatch,
  getBatch,
  listBatches,
  updateBatch,
} from "../controllers/batchesController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createBatchSchema,
  listBatchesQuery,
  updateBatchSchema,
} from "../validators/batches.js";

const router = Router();
router.use(authenticate);

router.post("/", validate(createBatchSchema), createBatch);
router.get("/", validate(listBatchesQuery, "query"), listBatches);
router.get("/:id", getBatch);
router.put("/:id", validate(updateBatchSchema), updateBatch);

export default router;
