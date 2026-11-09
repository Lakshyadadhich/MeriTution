export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseDurationMs(value) {
  if (typeof value === "number") return value * 1000;
  const match = /^(\d+)([smhd])$/.exec(String(value || ""));
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const factors = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return amount * factors[unit];
}
