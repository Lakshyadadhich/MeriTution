import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import {
  BookIcon,
  ChartIcon,
  CheckSquareIcon,
  DownloadIcon,
  InfoIcon,
  LogOutIcon,
  ReceiptIcon,
  SettingsIcon,
  UsersIcon,
  WalletIcon,
} from "../components/Icons.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../services/api.js";

const LINKS = [
  {
    to: "/settings",
    label: "Tuition Settings",
    description: "Profile, academic year and fee defaults",
    icon: SettingsIcon,
  },
  {
    to: "/batches",
    label: "Batches",
    description: "Class timings, days and student groups",
    icon: BookIcon,
  },
  {
    to: "/reports",
    label: "Reports",
    description: "Fees, dues, attendance and collections",
    icon: ChartIcon,
  },
];

const EXPORTS = [
  {
    key: "students",
    label: "Students",
    description: "All student profiles",
    icon: UsersIcon,
    run: () => api.exports.students(),
  },
  {
    key: "fees",
    label: "Fee records",
    description: "All monthly fee records",
    icon: WalletIcon,
    run: () => api.exports.fees(),
  },
  {
    key: "payments",
    label: "Payments",
    description: "All completed payments",
    icon: ReceiptIcon,
    run: () => api.exports.payments(),
  },
  {
    key: "attendance",
    label: "Attendance",
    description: "Attendance history",
    icon: CheckSquareIcon,
    run: () => api.exports.attendance(),
  },
];

export default function MorePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [busy, setBusy] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function runExport(item) {
    setBusy(item.key);
    try {
      const filename = await item.run();
      showToast(`Downloaded ${filename}`);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy("");
    }
  }

  async function runBackup() {
    setBusy("backup");
    try {
      const filename = await api.backup.export();
      showToast(`Backup downloaded: ${filename}`);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy("");
    }
  }

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div>
      <PageHeader title="More" subtitle="Tools, data and account" />

      <section className="space-y-2">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="card flex items-center gap-3 p-3 transition hover:border-brand-200"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">
                  {link.label}
                </span>
                <span className="block text-xs text-slate-500">{link.description}</span>
              </span>
            </Link>
          );
        })}
      </section>

      <section className="mt-6">
        <h2 className="section-title px-1">Export data</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {EXPORTS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => runExport(item)}
                disabled={Boolean(busy)}
                className="card flex flex-col items-start gap-2 p-3 text-left transition hover:border-brand-200 disabled:opacity-60"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {busy === item.key ? "Exporting…" : item.label}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {item.description}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                  <DownloadIcon className="h-3.5 w-3.5" /> Excel
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={runBackup}
          disabled={Boolean(busy)}
          className="card mt-2 flex w-full items-center gap-3 p-3 text-left transition hover:border-brand-200 disabled:opacity-60"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <DownloadIcon className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-slate-900">
              {busy === "backup" ? "Preparing backup…" : "Full JSON backup"}
            </span>
            <span className="block text-xs text-slate-500">
              Students, batches, fees, payments, attendance and settings
            </span>
          </span>
        </button>
        <p className="mt-2 px-1 text-xs text-slate-500">
          Restore a backup on the server with{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5">npm run restore -- backup.json</code>.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="section-title px-1">Account</h2>
        <div className="card mt-2 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user?.email || "Administrator"}
              </p>
              <p className="text-xs text-slate-500">Single administrator account</p>
            </div>
            <Badge tone="active">Signed in</Badge>
          </div>
          <Button
            variant="danger"
            fullWidth
            className="mt-3"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOutIcon className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </section>

      <section className="mt-6">
        <div className="card flex items-start gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <InfoIcon className="h-4 w-4" />
          </span>
          <div className="text-xs text-slate-500">
            <p className="text-sm font-semibold text-slate-800">Sharma Tuition Classes</p>
            <p className="mt-0.5">
              Version 1.0 · INR · Asia/Kolkata · installable PWA. Data is stored in your
              own MongoDB Atlas database.
            </p>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={logoutOpen}
        title="Log out?"
        message="You will need your email and password to sign in again."
        confirmLabel="Log out"
        variant="danger"
        loading={loggingOut}
        onConfirm={confirmLogout}
        onClose={() => setLogoutOpen(false)}
      />
    </div>
  );
}
