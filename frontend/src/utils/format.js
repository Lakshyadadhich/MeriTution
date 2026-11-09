export const TIMEZONE = "Asia/Kolkata";

export function todayISO(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function currentMonth(date = new Date()) {
  return todayISO(date).slice(0, 7);
}

export function formatCurrency(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);
}

export function rupeesToPaise(value) {
  return Math.round(Number(value || 0) * 100);
}

export function paiseToRupees(value) {
  return (Number(value) || 0) / 100;
}

export function formatDate(value, options = {}) {
  if (!value) return "—";
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatMonth(month) {
  if (!month) return "—";
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1, 1);
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export function monthOptions(count = 18) {
  const options = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value, label: formatMonth(value) });
  }
  return options;
}

export function gradeLabel(grade) {
  if (!grade) return "—";
  const number = Number(grade);
  if (Number.isNaN(number)) return grade;
  const suffix =
    number === 1
      ? "st"
      : number === 2
        ? "nd"
        : number === 3
          ? "rd"
          : "th";
  return `${number}${suffix} Class`;
}

export function paymentModeLabel(mode) {
  const labels = {
    cash: "Cash",
    upi: "UPI",
    bank_transfer: "Bank Transfer",
    other: "Other",
  };
  return labels[mode] || mode || "—";
}

export function feeStatusLabel(status) {
  return { unpaid: "Unpaid", partial: "Partial", paid: "Paid" }[status] || status;
}

export function attendanceLabel(status) {
  return { present: "Present", absent: "Absent", leave: "Leave" }[status] || status;
}

export function dayLabel(index) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index] || "";
}

export function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function initials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
