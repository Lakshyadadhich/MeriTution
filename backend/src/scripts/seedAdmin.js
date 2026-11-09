import bcrypt from "bcryptjs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import config from "../config/env.js";
import { connectDatabase, disconnectDatabase } from "../config/db.js";
import User from "../models/User.js";

export async function ensureAdmin({ silent = false } = {}) {
  const existing = await User.countDocuments();
  if (existing > 0) {
    return { created: false, reason: "An administrator already exists" };
  }
  if (!config.admin.password) {
    if (!silent) {
      console.warn(
        "No administrator created: set ADMIN_PASSWORD in backend/.env and run npm run seed:admin"
      );
    }
    return { created: false, reason: "ADMIN_PASSWORD is not set" };
  }

  const passwordHash = await bcrypt.hash(config.admin.password, 12);
  await User.create({
    name: config.admin.name,
    email: config.admin.email,
    passwordHash,
    role: "admin",
    isActive: true,
  });

  if (!silent) {
    console.log(`Administrator created: ${config.admin.email}`);
    console.log("Change the default password by updating ADMIN_PASSWORD before first use.");
  }
  return { created: true };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  try {
    await connectDatabase();
    await ensureAdmin();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}
