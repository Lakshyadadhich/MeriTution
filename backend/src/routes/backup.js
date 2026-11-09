import { Router } from "express";
import { exportBackup } from "../controllers/backupController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/export", exportBackup);

export default router;
