import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, logout, me } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema } from "../validators/auth.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: "RATE_LIMITED", message: "Too many login attempts. Try again later." } },
});

router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;
