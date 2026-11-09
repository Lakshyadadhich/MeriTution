import { classNames } from "../utils/format.js";

const TONES = {
  brand: "bg-brand-50 text-brand-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  slate: "bg-slate-100 text-slate-700",
};

export default function StatCard({ label, value, hint, tone = "brand", icon: Icon, onClick }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={classNames(
        "card flex flex-col gap-2 p-4 text-left",
        onClick && "transition hover:border-brand-200 active:scale-[0.99]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {Icon && (
          <span
            className={classNames(
              "flex h-8 w-8 items-center justify-center rounded-xl",
              TONES[tone] || TONES.brand
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="text-2xl font-bold leading-tight text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </Wrapper>
  );
}
