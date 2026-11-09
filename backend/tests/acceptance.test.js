process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key";
process.env.JWT_EXPIRES_IN = "1d";
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "TestPass@123";
process.env.TIMEZONE = "Asia/Kolkata";
process.env.CLIENT_ORIGIN = "http://localhost:5173";

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

let mongod;
let app;
let User;
let Student;
let FeeRecord;
let Payment;
let Attendance;
let agent;

const MONTH = "2026-11";
const NEXT_MONTH = "2026-12";

async function login() {
  agent = request.agent(app);
  const res = await agent
    .post("/api/auth/login")
    .send({ email: "admin@test.local", password: "TestPass@123" });
  assert.equal(res.status, 200, JSON.stringify(res.body));
}

async function createBatch(overrides = {}) {
  const res = await agent.post("/api/batches").send({
    name: "Evening Batch",
    grades: ["8", "9"],
    startTime: "17:00",
    endTime: "18:30",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    ...overrides,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.batch;
}

async function createStudent(overrides = {}) {
  const payload = {
    personalInfo: { fullName: "Aarav Sharma", gender: "male" },
    parentInfo: {
      fatherName: "Rakesh Sharma",
      motherName: "Sunita Sharma",
      primaryContact: "9876543210",
    },
    academicInfo: {
      schoolName: "City Public School",
      grade: "8",
      subjects: ["Maths", "Science"],
    },
    tuitionInfo: {
      monthlyFee: 200000,
      dueDay: 5,
      joiningDate: "2026-11-01",
    },
    ...overrides,
  };
  const res = await agent.post("/api/students").send(payload);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri("tuition_test");

  const db = await import("../src/config/db.js");
  await db.connectDatabase(process.env.MONGODB_URI);

  ({ default: User } = await import("../src/models/User.js"));
  ({ default: Student } = await import("../src/models/Student.js"));
  ({ default: FeeRecord } = await import("../src/models/FeeRecord.js"));
  ({ default: Payment } = await import("../src/models/Payment.js"));
  ({ default: Attendance } = await import("../src/models/Attendance.js"));

  await User.create({
    name: "Test Admin",
    email: "admin@test.local",
    passwordHash: await bcrypt.hash("TestPass@123", 10),
    role: "admin",
  });

  ({ default: app } = await import("../src/app.js"));
});

after(async () => {
  const db = await import("../src/config/db.js");
  await db.disconnectDatabase();
  await mongod.stop();
});

test("health check is public and protected routes require auth", async () => {
  const health = await request(app).get("/api/health");
  assert.equal(health.status, 200);

  const blocked = await request(app).get("/api/students");
  assert.equal(blocked.status, 401);
  assert.equal(blocked.body.error.code, "UNAUTHORIZED");

  const badLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@test.local", password: "wrong" });
  assert.equal(badLogin.status, 401);

  await login();
  const me = await agent.get("/api/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, "admin@test.local");
});

test("student creation assigns unique codes and warns about duplicates", async () => {
  const batch = await createBatch();
  const first = await createStudent({ tuitionInfo: { monthlyFee: 200000, dueDay: 5, joiningDate: "2026-11-01", batchId: batch._id } });
  assert.equal(first.student.studentCode, "STU-0001");
  assert.equal(first.duplicateWarnings.length, 0);

  const sibling = await createStudent({
    personalInfo: { fullName: "Ananya Sharma", gender: "female" },
    tuitionInfo: { monthlyFee: 150000, dueDay: 10, joiningDate: "2026-11-02", batchId: batch._id },
  });
  assert.equal(sibling.student.studentCode, "STU-0002");
  assert.ok(
    sibling.duplicateWarnings.some((w) => w.reasons.includes("Shared parent contact")),
    "shared parent contact must warn but still be allowed"
  );

  const duplicate = await createStudent({
    personalInfo: { fullName: "Aarav Sharma" },
    tuitionInfo: { monthlyFee: 200000, dueDay: 5, joiningDate: "2026-11-03", batchId: batch._id },
  });
  assert.ok(
    duplicate.duplicateWarnings.some((w) => w.reasons.includes("Same student name"))
  );
});

test("monthly fee generation is idempotent and snapshots the fee", async () => {
  const first = await agent.post("/api/fees/generate").send({ feeMonth: MONTH });
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.equal(first.body.created, 3);

  const second = await agent.post("/api/fees/generate").send({ feeMonth: MONTH });
  assert.equal(second.status, 201);
  assert.equal(second.body.created, 0);
  assert.equal(second.body.skipped, 3);

  const count = await FeeRecord.countDocuments({ feeMonth: MONTH });
  assert.equal(count, 3);

  const student = await Student.findOne({ studentCode: "STU-0001" });
  const fee = await FeeRecord.findOne({ studentId: student._id, feeMonth: MONTH });
  assert.equal(fee.baseAmount, 200000);
  assert.equal(fee.totalDue, 200000);
  assert.equal(fee.balanceAmount, 200000);
  assert.equal(fee.status, "unpaid");

  await agent
    .put(`/api/students/${student._id}`)
    .send({ tuitionInfo: { monthlyFee: 250000 } })
    .expect(200);

  const unchanged = await FeeRecord.findById(fee._id);
  assert.equal(unchanged.baseAmount, 200000, "historical fee must not change");

  await agent.post("/api/fees/generate").send({ feeMonth: NEXT_MONTH }).expect(201);
  const nextFee = await FeeRecord.findOne({ studentId: student._id, feeMonth: NEXT_MONTH });
  assert.equal(nextFee.baseAmount, 250000, "future fee uses the new amount");
});

test("payments support partial and multiple transactions; overpayment is rejected", async () => {
  const student = await Student.findOne({ studentCode: "STU-0001" });
  const fee = await FeeRecord.findOne({ studentId: student._id, feeMonth: MONTH });

  const partial = await agent.post("/api/payments").send({
    studentId: student._id.toString(),
    feeRecordId: fee._id.toString(),
    amount: 50000,
    paymentDate: "2026-11-05",
    paymentMode: "upi",
  });
  assert.equal(partial.status, 201, JSON.stringify(partial.body));
  assert.equal(partial.body.fee.status, "partial");
  assert.equal(partial.body.fee.balanceAmount, 150000);
  assert.match(partial.body.payment.receiptNumber, /^REC-\d{4}$/);

  const overpay = await agent.post("/api/payments").send({
    studentId: student._id.toString(),
    feeRecordId: fee._id.toString(),
    amount: 500000,
    paymentDate: "2026-11-06",
    paymentMode: "cash",
  });
  assert.equal(overpay.status, 422);

  const second = await agent.post("/api/payments").send({
    studentId: student._id.toString(),
    feeRecordId: fee._id.toString(),
    amount: 150000,
    paymentDate: "2026-11-06",
    paymentMode: "cash",
  });
  assert.equal(second.status, 201, JSON.stringify(second.body));
  assert.equal(second.body.fee.status, "paid");
  assert.equal(second.body.fee.balanceAmount, 0);

  const payments = await Payment.find({ feeRecordId: fee._id });
  assert.equal(payments.length, 2);
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  assert.equal(total, fee.totalDue);
});

test("payment reversal recalculates balances and is excluded from collection", async () => {
  const student = await Student.findOne({ studentCode: "STU-0001" });
  const fee = await FeeRecord.findOne({ studentId: student._id, feeMonth: MONTH });
  const payments = await Payment.find({ feeRecordId: fee._id }).sort({ amount: 1 });
  const cashPayment = payments.find((p) => p.paymentMode === "cash");

  const reverse = await agent
    .post(`/api/payments/${cashPayment._id}/reverse`)
    .send({ reason: "Incorrect entry" });
  assert.equal(reverse.status, 200, JSON.stringify(reverse.body));
  assert.equal(reverse.body.payment.status, "reversed");
  assert.equal(reverse.body.payment.reversalReason, "Incorrect entry");
  assert.equal(reverse.body.fee.status, "partial");
  assert.equal(reverse.body.fee.balanceAmount, 150000);

  const again = await agent
    .post(`/api/payments/${cashPayment._id}/reverse`)
    .send({ reason: "Duplicate" });
  assert.equal(again.status, 409);

  const collection = await agent.get(`/api/reports/collection?month=${MONTH}`);
  assert.equal(collection.status, 200);
  assert.equal(collection.body.total, 50000, "reversed payment must not count");

  const history = await Payment.find({ feeRecordId: fee._id });
  assert.equal(history.length, 2, "original transaction is retained");
});

test("fee discount updates totals but cannot go below paid amount", async () => {
  const student = await Student.findOne({ studentCode: "STU-0002" });
  const fee = await FeeRecord.findOne({ studentId: student._id, feeMonth: MONTH });

  const discount = await agent
    .put(`/api/fees/${fee._id}`)
    .send({ discountAmount: 10000 });
  assert.equal(discount.status, 200, JSON.stringify(discount.body));
  assert.equal(discount.body.fee.totalDue, 140000);
  assert.equal(discount.body.fee.balanceAmount, 140000);

  const tooMuch = await agent
    .put(`/api/fees/${fee._id}`)
    .send({ discountAmount: 160000 });
  assert.equal(tooMuch.status, 400);
});

test("attendance is unique per student, batch and date and supports corrections", async () => {
  const students = await Student.find({ status: "active" }).limit(2);
  const batchId = students[0].tuitionInfo.batchId.toString();

  const payload = {
    batchId,
    attendanceDate: "2026-11-10",
    records: students.map((s) => ({ studentId: s._id.toString(), status: "present" })),
  };

  const first = await agent.post("/api/attendance/bulk").send(payload);
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.equal(first.body.created, 2);
  assert.equal(first.body.saved, 2);

  const retry = await agent.post("/api/attendance/bulk").send({
    ...payload,
    records: students.map((s) => ({ studentId: s._id.toString(), status: "absent" })),
  });
  assert.equal(retry.status, 201);
  assert.equal(retry.body.created, 0);
  assert.equal(retry.body.updated, 2);

  const count = await Attendance.countDocuments({ attendanceDate: "2026-11-10" });
  assert.equal(count, 2, "no duplicate attendance rows");

  const saved = await Attendance.findOne({ attendanceDate: "2026-11-10" });
  const correction = await agent
    .put(`/api/attendance/${saved._id}`)
    .send({ status: "leave", remarks: "Family function" });
  assert.equal(correction.status, 200);
  assert.equal(correction.body.attendance.status, "leave");

  const report = await agent.get(
    `/api/reports/attendance?from=2026-11-01&to=2026-11-30&batchId=${batchId}`
  );
  assert.equal(report.status, 200);
  assert.ok(report.body.items.length >= 2);
  assert.ok(report.body.items[0].scheduledSessions > 0);
});

test("deactivation excludes a student from future fee generation", async () => {
  const student = await Student.findOne({ studentCode: "STU-0003" });
  await agent
    .patch(`/api/students/${student._id}/status`)
    .send({ status: "inactive" })
    .expect(200);

  const generation = await agent
    .post("/api/fees/generate")
    .send({ feeMonth: "2027-01" });
  assert.equal(generation.status, 201);
  assert.equal(generation.body.created, 2);

  const inactiveFee = await FeeRecord.findOne({
    studentId: student._id,
    feeMonth: "2027-01",
  });
  assert.equal(inactiveFee, null);

  const history = await FeeRecord.countDocuments({ studentId: student._id });
  assert.ok(history >= 1, "historical fee records are preserved");
});

test("dashboard reconciles with underlying records", async () => {
  const res = await agent.get(`/api/reports/dashboard?feeMonth=${MONTH}`);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.activeStudents, 2);
  assert.equal(res.body.collection.monthCollection, 50000);
  assert.equal(res.body.fees.collected, 50000);
  assert.equal(res.body.fees.outstanding, 490000);
  assert.ok(res.body.pendingFees.length >= 1);
  assert.equal(res.body.fees.unpaid, 2);
  assert.equal(res.body.fees.partial, 1);
  assert.equal(res.body.fees.paid, 0);
});

test("student profile returns fee, payment and attendance history", async () => {
  const student = await Student.findOne({ studentCode: "STU-0001" });
  const res = await agent.get(`/api/students/${student._id}`);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.feeRecords.length >= 2);
  assert.ok(res.body.payments.length >= 2);
  assert.ok(res.body.attendanceSummary.total >= 1);
});

test("exports and backup produce downloadable files", async () => {
  const students = await agent.get("/api/exports/students.xlsx");
  assert.equal(students.status, 200);
  assert.match(
    students.headers["content-type"],
    /spreadsheetml/
  );
  assert.ok(Number(students.headers["content-length"]) > 1000);

  const fees = await agent.get(`/api/exports/fees.xlsx?feeMonth=${MONTH}`);
  assert.equal(fees.status, 200);
  assert.ok(Number(fees.headers["content-length"]) > 1000);

  const payments = await agent.get(`/api/exports/payments.xlsx?from=2026-11-01&to=2026-11-30`);
  assert.equal(payments.status, 200);
  assert.ok(Number(payments.headers["content-length"]) > 1000);

  const attendance = await agent.get(
    "/api/exports/attendance.xlsx?from=2026-11-01&to=2026-11-30"
  );
  assert.equal(attendance.status, 200);
  assert.ok(Number(attendance.headers["content-length"]) > 1000);

  const backup = await agent.get("/api/backup/export");
  assert.equal(backup.status, 200);
  assert.equal(backup.body.version, 1);
  assert.ok(backup.body.data.students.length >= 3);
  assert.ok(backup.body.data.payments.length >= 2);
  assert.equal(backup.body.data.settings.length, 1);
});

test("settings can be updated and are validated", async () => {
  const update = await agent.put("/api/settings").send({
    tuitionName: "Sharma Tuition Classes",
    academicYear: "2026-27",
    feeGenerationDay: 3,
  });
  assert.equal(update.status, 200, JSON.stringify(update.body));
  assert.equal(update.body.settings.tuitionName, "Sharma Tuition Classes");

  const invalid = await agent.put("/api/settings").send({ academicYear: "26-27" });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "VALIDATION_ERROR");
});

test("validation rejects invalid ids and months", async () => {
  const badMonth = await agent.get("/api/fees?feeMonth=2026-13");
  assert.equal(badMonth.status, 400);

  const badId = await agent.get("/api/students/not-an-id");
  assert.equal(badId.status, 400);

  const missing = await agent.get("/api/students/000000000000000000000000");
  assert.equal(missing.status, 404);
});
