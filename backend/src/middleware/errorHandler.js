import { ZodError } from "zod";
import ApiError from "../utils/ApiError.js";

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details = err.details || null;
  let code = err.code || "INTERNAL_ERROR";

  if (err instanceof ZodError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Invalid request data";
    details = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Database validation failed";
    details = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
  } else if (err.name === "CastError") {
    statusCode = 400;
    code = "INVALID_ID";
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE";
    message = "A record with these values already exists";
    details = err.keyValue || null;
  } else if (err.type === "entity.parse.failed") {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Request body is not valid JSON";
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: { code, message, details },
  });
}
