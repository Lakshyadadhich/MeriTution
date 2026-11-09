import fs from "node:fs";
import path from "node:path";
import config from "../config/env.js";
import { connectDatabase, disconnectDatabase } from "../config/db.js";
import Attendance from "../models/Attendance.js";
import AuditLog from "../models/AuditLog.js";
import Batch from "../models/Batch.js";
import Counter from "../models/Counter.js";
import FeeRecord from "../models/FeeRecord.js";
import Payment from "../models/Payment.js";
import Settings from "../models/Settings.js";
import Student from "../models/Student.js";

const COLLECTIONS = [
  ["students", Student],
  ["batches", Batch],
  ["feeRecords", FeeRecord],
  ["payments", Payment],
  ["attendance", Attendance],
  ["counters", Counter],
  ["settings", Settings],
  ["auditLogs", AuditLog],
];

async function main() {
  const file = process.argv[2];
  const drop = process.argv.includes("--drop");
  if (!file) {
    console.error("Usage: npm run restore -- <backup.json> [--drop]");
    process.exit(1);
  }

  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) {
    console.error(`Backup file not found: ${absolute}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(absolute, "utf8"));
  if (!payload?.data) {
    console.error("Invalid backup file: missing data object");
    process.exit(1);
  }

  if (!config.mongoUri) {
    console.error("MONGODB_URI is not set in backend/.env");
    process.exit(1);
  }

  await connectDatabase();
  console.log(`Restoring backup from ${absolute}`);
  if (drop) console.log("Mode: replace existing documents (--drop)");

  for (const [name, Model] of COLLECTIONS) {
    const docs = payload.data[name];
    if (!Array.isArray(docs) || docs.length === 0) {
      console.log(`${name}: nothing to restore`);
      continue;
    }

    if (drop) {
      await Model.deleteMany({});
      await Model.insertMany(docs, { ordered: false });
    } else {
      const operations = docs.map((doc) => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      }));
      await Model.bulkWrite(operations, { ordered: false });
    }
    console.log(`${name}: restored ${docs.length} document(s)`);
  }

  const counts = {
    students: await Student.countDocuments(),
    batches: await Batch.countDocuments(),
    feeRecords: await FeeRecord.countDocuments(),
    payments: await Payment.countDocuments(),
    attendance: await Attendance.countDocuments(),
  };
  console.log("Verification counts:", counts);
  console.log(
    "Note: administrator accounts are not part of backups. Run npm run seed:admin if needed."
  );

  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error("Restore failed:", error.message);
  await disconnectDatabase();
  process.exit(1);
});
