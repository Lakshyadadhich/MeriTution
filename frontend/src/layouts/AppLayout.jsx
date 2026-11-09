import { NavLink, Outlet, useLocation } from "react-router-dom";
import BrandMark from "../components/BrandMark.jsx";
import {
  CheckSquareIcon,
  HomeIcon,
  MenuIcon,
  SettingsIcon,
  UsersIcon,
  WalletIcon,
} from "../components/Icons.jsx";
import { classNames } from "../utils/format.js";

const TABS = [
  { to: "/", label: "Home", icon: HomeIcon, exact: true },
  { to: "/students", label: "Students", icon: UsersIcon },
  { to: "/attendance", label: "Attendance", icon: CheckSquareIcon },
  { to: "/fees", label: "Fees", icon: WalletIcon },
  { to: "/more", label: "More", icon: MenuIcon },
];

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-9 w-9" />
            <div>
              <p className="text-sm font-bold leading-tight text-slate-900">
                Sharma Tuition Classes
              </p>
              <p className="text-[11px] leading-tight text-slate-500">
                Fees, students & attendance
              </p>
            </div>
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              classNames(
                "rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100",
                isActive && "bg-brand-50 text-brand-700"
              )
            }
            aria-label="Settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </NavLink>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {TABS.map((tab) => {
            const active = tab.exact
              ? location.pathname === tab.to
              : location.pathname.startsWith(tab.to);
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={classNames(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition",
                  active ? "text-brand-700" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <span
                  className={classNames(
                    "flex h-8 w-12 items-center justify-center rounded-xl transition",
                    active && "bg-brand-50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
