import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/env.js";
import { COOKIE_NAME } from "../middleware/auth.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parseDurationMs } from "../utils/helpers.js";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
  };
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: parseDurationMs(config.jwtExpiresIn),
  });

  res.json({ user: user.toSafeJSON() });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.json({ message: "Logged out" });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});
