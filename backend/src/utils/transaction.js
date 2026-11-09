import mongoose from "mongoose";

export async function runInTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (error) {
    const message = String(error?.message || "");
    if (
      message.includes("Transaction numbers are only allowed") ||
      message.includes("replica set")
    ) {
      return fn(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export default runInTransaction;
