import { useNavigate } from "react-router-dom";
import { ChevronLeftIcon } from "./Icons.jsx";

export default function PageHeader({ title, subtitle, action, back = false, backTo }) {
  const navigate = useNavigate();
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {back && (
          <button
            type="button"
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            className="-ml-2 mt-0.5 rounded-xl p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Go back"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
