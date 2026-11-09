import AuditLog from "../models/AuditLog.js";

export async function audit(action, { entityType, entityId, performedBy, details } = {}) {
  try {
    await AuditLog.create({
      action,
      entityType,
      entityId,
      performedBy,
      details: details || {},
    });
  } catch {
    // Auditing must never break the primary operation.
  }
}

export default audit;
