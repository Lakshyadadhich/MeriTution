import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import {
  CheckSquareIcon,
  ChevronRightIcon,
  ClockIcon,
  PlusIcon,
  UsersIcon,
  WalletIcon,
} from "../components/Icons.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import { ErrorState, LoadingBlock } from "../components/States.jsx";
import { Select } from "../components/Field.jsx";
import api from "../services/api.js";
import {
  currentMonth,
  formatCurrency,
  formatDate,
  formatMonth,
  gradeLabel,
  monthOptions,
} from "../utils/format.js";

const QUICK_ACTIONS = [
  {
    label: "Add Student",
    to: "/students/new",
    icon: PlusIcon,
    tone: "bg-brand-50 text-brand-700",
  },
  {
    label: "Collect Fee",
    to: "/fees",
    icon: WalletIcon,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Mark Attendance",
    to: "/attendance",
    icon: CheckSquareIcon,
    tone: "bg-sky-50 text-sky-700",
  },
  {
    label: "Pending Fees",
    to: "/fees?status=unpaid",
    icon: ClockIcon,
    tone: "bg-amber-50 text-amber-700",
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.reports.dashboard({ feeMonth: month });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={data ? formatDate(data.today) : "Overview of your tuition classes"}
        action={
          <Select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="w-auto py-2 text-sm"
            aria-label="Fee month"
          >
            {monthOptions(18).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        }
      />

      {loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Active Students"
              value={data.activeStudents}
              hint="Currently enrolled"
              icon={UsersIcon}
              onClick={() => navigate("/students")}
            />
            <StatCard
              label="Attendance Today"
              value={`${data.attendanceToday.present}/${data.attendanceToday.totalExpected}`}
              hint={
                data.attendanceToday.totalExpected === 0
                  ? "No sessions scheduled today"
                  : `${data.attendanceToday.marked} marked · ${data.attendanceToday.scheduledBatches} batch(es)`
              }
              tone="emerald"
              icon={CheckSquareIcon}
              onClick={() => navigate("/attendance")}
            />
            <StatCard
              label={`Collected ${formatMonth(month)}`}
              value={formatCurrency(data.collection.monthCollection)}
              hint={`${data.collection.monthPayments} completed payment(s)`}
              tone="amber"
              icon={WalletIcon}
              onClick={() => navigate("/fees")}
            />
            <StatCard
              label="Outstanding"
              value={formatCurrency(data.outstanding.feeMonthOutstanding)}
              hint={`${formatMonth(month)} · All months: ${formatCurrency(
                data.outstanding.allMonthsOutstanding
              )}`}
              tone="red"
              icon={ClockIcon}
              onClick={() => navigate("/fees?status=unpaid")}
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className="card flex flex-col items-center gap-2 px-2 py-3 text-center transition hover:border-brand-200 active:scale-[0.98]"
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${action.tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-semibold leading-tight text-slate-700">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="card px-3 py-3 text-center">
              <p className="text-lg font-bold text-red-600">{data.fees.unpaid}</p>
              <p className="text-[11px] font-medium text-slate-500">Unpaid</p>
            </div>
            <div className="card px-3 py-3 text-center">
              <p className="text-lg font-bold text-amber-600">{data.fees.partial}</p>
              <p className="text-[11px] font-medium text-slate-500">Partial</p>
            </div>
            <div className="card px-3 py-3 text-center">
              <p className="text-lg font-bold text-emerald-600">{data.fees.paid}</p>
              <p className="text-[11px] font-medium text-slate-500">Paid</p>
            </div>
          </div>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Pending Fees</h2>
                <p className="text-xs text-slate-500">{formatMonth(month)}</p>
              </div>
              <Link
                to="/fees"
                className="flex items-center gap-1 text-xs font-semibold text-brand-700"
              >
                View all
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </div>
            {data.pendingFees.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                No pending fees for this month.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.pendingFees.map((fee) => (
                  <li key={fee._id}>
                    <Link
                      to={`/payments/new?feeRecordId=${fee._id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {fee.studentId?.personalInfo?.fullName || "Student"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {fee.studentId?.studentCode} ·{" "}
                          {gradeLabel(fee.studentId?.academicInfo?.grade)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">
                          {formatCurrency(fee.balanceAmount)}
                        </p>
                        <Badge tone={fee.status} className="mt-0.5">
                          {fee.status}
                        </Badge>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">Recently Added Students</h2>
              <Link
                to="/students"
                className="flex items-center gap-1 text-xs font-semibold text-brand-700"
              >
                View all
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </div>
            {data.recentStudents.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-slate-500">No students yet.</p>
                <Button className="mt-3" size="sm" onClick={() => navigate("/students/new")}>
                  Add your first student
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentStudents.map((student) => (
                  <li key={student._id}>
                    <Link
                      to={`/students/${student._id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {student.personalInfo.fullName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {student.studentCode} · {gradeLabel(student.academicInfo.grade)}
                        </p>
                      </div>
                      <Badge tone={student.status}>{student.status}</Badge>
                      <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
