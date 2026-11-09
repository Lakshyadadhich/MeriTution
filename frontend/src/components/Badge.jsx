import { classNames } from "../utils/format.js";

const STYLES = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  unpaid: "bg-red-50 text-red-700 border-red-200",
  present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  absent: "bg-red-50 text-red-700 border-red-200",
  leave: "bg-sky-50 text-sky-700 border-sky-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  reversed: "bg-slate-100 text-slate-600 border-slate-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Badge({ tone = "neutral", children, className }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        STYLES[tone] || STYLES.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}
