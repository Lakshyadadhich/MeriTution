import config from "../config/env.js";

export const TIMEZONE = config.timezone;

export function todayInTz(timeZone = TIMEZONE, date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function currentMonthInTz(timeZone = TIMEZONE, date = new Date()) {
  return todayInTz(timeZone, date).slice(0, 7);
}

export function isValidMonth(value) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function isValidDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonths(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function dueDateForMonth(feeMonth, dueDay = 5) {
  const [y, m] = feeMonth.split("-").map(Number);
  const day = Math.min(Math.max(Number(dueDay) || 1, 1), daysInMonth(y, m));
  return new Date(Date.UTC(y, m - 1, day));
}

export function monthRangeUtc(feeMonth) {
  const start = new Date(`${feeMonth}-01T00:00:00Z`);
  const nextMonth = addMonths(feeMonth, 1);
  const end = new Date(`${nextMonth}-01T00:00:00Z`);
  return { start, end };
}

export function localDateToUtc(dateOnly) {
  return new Date(`${dateOnly}T00:00:00Z`);
}

export function defaultAcademicYear(date = new Date()) {
  const year = Number(todayInTz(TIMEZONE, date).slice(0, 4));
  return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
}

export function weekdayIndex(dateOnly) {
  return localDateToUtc(dateOnly).getUTCDay();
}

export function enumerateDates(from, to) {
  const out = [];
  const start = localDateToUtc(from);
  const end = localDateToUtc(to);
  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
