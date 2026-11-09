import { ensureAdmin } from "../scripts/seedAdmin.js";
import { connectDatabase } from "./db.js";

let readyPromise = null;

export function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await connectDatabase();
      return ensureAdmin({ silent: true });
    })().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }
  return readyPromise;
}
