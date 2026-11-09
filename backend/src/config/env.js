import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "insecure-development-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieSecure: String(process.env.COOKIE_SECURE || "false") === "true",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  timezone: process.env.TIMEZONE || "Asia/Kolkata",
  admin: {
    name: process.env.ADMIN_NAME || "Tuition Administrator",
    email: (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "",
  },
};

export default config;
