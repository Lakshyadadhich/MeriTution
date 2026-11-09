import { classNames } from "../utils/format.js";

export function Field({ label, hint, error, required, children, className }) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="helper">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ className, ...props }) {
  return <input className={classNames("input", className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={classNames("input appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, rows = 3, ...props }) {
  return (
    <textarea className={classNames("input", className)} rows={rows} {...props} />
  );
}

export function Checkbox({ label, className, ...props }) {
  return (
    <label
      className={classNames(
        "flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700",
        className
      )}
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-200"
        {...props}
      />
      {label}
    </label>
  );
}
