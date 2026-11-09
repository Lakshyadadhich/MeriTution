import Counter from "../models/Counter.js";

export async function nextSequence(name) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
}

export function formatCode(prefix, seq, width = 4) {
  return `${prefix}-${String(seq).padStart(width, "0")}`;
}

export async function nextStudentCode() {
  return formatCode("STU", await nextSequence("student"));
}

export async function nextReceiptNumber() {
  return formatCode("REC", await nextSequence("receipt"));
}
