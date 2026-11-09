export function toPaise(rupees) {
  return Math.round(Number(rupees) * 100);
}

export function toRupees(paise) {
  return Math.round(Number(paise)) / 100;
}

export function formatInr(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(toRupees(paise));
}

export function isNonNegativeInt(value) {
  return Number.isInteger(value) && value >= 0;
}

export function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}
