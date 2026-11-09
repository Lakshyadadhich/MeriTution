import { Router } from "express";
import * as settingsController from "../controllers/settingsController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { settingsSchema } from "../validators/settings.js";

const router = Router();
router.use(authenticate);

router.get("/", settingsController.get);
router.put("/", validate(settingsSchema), settingsController.update);

export default router;
