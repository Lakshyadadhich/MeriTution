import jwt from "jsonwebtoken";
import config from "../config/env.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const COOKIE_NAME = "tm_token";

export const authenticate = asyncHandler(async (req, _res, next) => {
  let token = req.cookies?.[COOKIE_NAME];
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7);
  }
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw ApiError.unauthorized("Session expired or invalid. Please log in again.");
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized("Account is not active");

  req.user = user;
  next();
});

export default authenticate;
