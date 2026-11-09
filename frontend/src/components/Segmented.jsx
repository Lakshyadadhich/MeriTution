import { classNames } from "../utils/format.js";

export default function Segmented({ options, value, onChange, className }) {
  return (
    <div
      className={classNames(
        "flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={classNames(
              "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={classNames(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-brand-100 text-brand-700" : "bg-slate-200 text-slate-600"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
