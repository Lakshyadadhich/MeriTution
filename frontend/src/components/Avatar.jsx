import { initials } from "../utils/format.js";

export default function Avatar({ name, size = "md", className = "" }) {
  const sizes = {
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-lg",
  };
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-brand-100 font-bold text-brand-800 ${sizes[size] || sizes.md} ${className}`}
    >
      {initials(name) || "?"}
    </div>
  );
}
