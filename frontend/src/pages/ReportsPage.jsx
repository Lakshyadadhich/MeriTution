import { useEffect, useState } from "react";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import { Field, Select, TextInput } from "../components/Field.jsx";
import { ChartIcon, DownloadIcon } from "../components/Icons.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Segmented from "../components/Segmented.jsx";
import { EmptyState, ErrorState, LoadingBlock } from "../components/States.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../services/api.js";
import {
  currentMonth,
  formatCurrency,
  formatDate,
  formatMonth,
  gradeLabel,
  monthOptions,
  paymentModeLabel,
  todayISO,
} from "../utils/format.js";

const TABS = [
  { value: "fees", label: "Fees" },
  { value: "outstanding", label: "Due" },
  { value: "attendance", label: "Attendance" },
  { value: "collection", label: "Collection" },
];

export default function ReportsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState("fees");
  const [month, setMonth] = useState(currentMonth());
  const [from, setFrom] = useState(`${currentMonth()}-01`);
  const [to, setTo] = useState(todayISO());
  const [batchId, setBatchId] = useState("");
  const [batches, setBatches] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.batches
      .list({ limit: 100 })
      .then((result) => setBatches(result.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);

    const request =
      tab === "fees"
        ? api.reports.fees({ feeMonth: month })
        : tab === "outstanding"
          ? api.reports.outstanding({ feeMonth: month })
          : tab === "attendance"
            ? api.reports.attendance({ from, to, batchId: batchId || undefined })
            : api.reports.collection({ month: month || undefined });

    request
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tab, month, from, to, batchId]);

  async function download() {
    setExporting(true);
    try {
      let filename;
      if (tab === "attendance") {
        filename = await api.exports.attendance({
          from,
          to,
          batchId: batchId || undefined,
        });
      } else if (tab === "collection") {
        filename = await api.exports.payments({ month: month || undefined });
      } else {
        filename = await api.exports.fees({ feeMonth: month });
      }
      showToast(`Downloaded ${filename}`);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Monthly fees, dues, attendance and collections"
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={download}
            disabled={exporting || loading}
          >
            <DownloadIcon className="h-4 w-4" />
            {exporting ? "Exporting…" : "Excel"}
          </Button>
        }
      />

      <Segmented options={TABS} value={tab} onChange={setTab} />

      <div className="card mt-4 space-y-3 p-4">
        {tab === "attendance" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <TextInput
                  type="date"
                  value={from}
                  max={to}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </Field>
              <Field label="To">
                <TextInput
                  type="date"
                  value={to}
                  min={from}
                  max={todayISO()}
                  onChange={(event) => setTo(event.target.value)}
                />
              </Field>
            </div>
            <Field label="Batch">
              <Select value={batchId} onChange={(event) => setBatchId(event.target.value)}>
                <option value="">All batches</option>
                {batches.map((batch) => (
                  <option key={batch._id} value={batch._id}>
                    {batch.name}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : (
          <Field label={tab === "collection" ? "Collection month" : "Fee month"}>
            <Select value={month} onChange={(event) => setMonth(event.target.value)}>
              {tab === "collection" && <option value="">All time</option>}
              {monthOptions(18).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <LoadingBlock label="Building report…" />
        ) : error ? (
          <ErrorState message={error} />
        ) : tab === "fees" || tab === "outstanding" ? (
          <FeesReport data={data} />
        ) : tab === "attendance" ? (
          <AttendanceReport data={data} />
        ) : (
          <CollectionReport data={data} />
        )}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-800",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    brand: "bg-brand-50 text-brand-800",
  };
  return (
    <div className={`rounded-xl p-2.5 text-center ${tones[tone]}`}>
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[11px] font-medium opacity-80">{label}</p>
    </div>
  );
}

function FeesReport({ data }) {
  const summary = data?.summary;
  const items = data?.items || [];

  return (
    <div className="space-y-3">
      {summary && (
        <div className="grid grid-cols-4 gap-2">
          <SummaryTile label="Records" value={summary.count} />
          <SummaryTile label="Due" value={formatCurrency(summary.totalDue)} />
          <SummaryTile
            label="Collected"
            value={formatCurrency(summary.collected)}
            tone="green"
          />
          <SummaryTile
            label="Outstanding"
            value={formatCurrency(summary.outstanding)}
            tone="red"
          />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={ChartIcon}
          title="Nothing to report"
          description="No fee records match this month."
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item._id} className="card flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {item.studentId?.personalInfo?.fullName || "Student"}
                </p>
                <p className="text-xs text-slate-500">
                  {item.studentId?.studentCode} · {formatMonth(item.feeMonth)} ·{" "}
                  {gradeLabel(item.studentId?.academicInfo?.grade)}
                  {item.batchName ? ` · ${item.batchName}` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Due {formatCurrency(item.totalDue)} · Paid{" "}
                  {formatCurrency(item.amountPaid)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">
                  {formatCurrency(item.balanceAmount)}
                </p>
                <Badge tone={item.status} className="mt-1">
                  {item.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AttendanceReport({ data }) {
  const items = data?.items || [];
  const totals = items.reduce(
    (acc, item) => {
      acc.present += item.present;
      acc.absent += item.absent;
      acc.leave += item.leave;
      return acc;
    },
    { present: 0, absent: 0, leave: 0 }
  );

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <p className="text-xs text-slate-500">
          {formatDate(data?.from)} to {formatDate(data?.to)} · {items.length} student(s)
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <SummaryTile label="Present marks" value={totals.present} tone="green" />
          <SummaryTile label="Absent marks" value={totals.absent} tone="red" />
          <SummaryTile label="Leave marks" value={totals.leave} tone="brand" />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ChartIcon}
          title="No attendance data"
          description="No students matched this range and batch."
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.studentId} className="card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {item.fullName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.studentCode} · {gradeLabel(item.grade)}
                    {item.batchName ? ` · ${item.batchName}` : ""}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {item.percentage === null ? "—" : `${item.percentage}%`}
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{ width: `${item.percentage ?? 0}%` }}
                />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] font-medium text-slate-500">
                <span>Present {item.present}</span>
                <span>Absent {item.absent}</span>
                <span>Leave {item.leave}</span>
                <span>Scheduled {item.scheduledSessions}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionReport({ data }) {
  const items = data?.items || [];
  const byMode = data?.byMode || {};

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <p className="text-xs text-slate-500">{data?.rangeLabel}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {formatCurrency(data?.total || 0)}
        </p>
        <p className="text-xs text-slate-500">Total collected</p>
        {Object.keys(byMode).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(byMode).map(([mode, amount]) => (
              <span
                key={mode}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
              >
                {paymentModeLabel(mode)}: {formatCurrency(amount)}
              </span>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ChartIcon}
          title="No collections"
          description="No completed payments were recorded for this period."
        />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li
                key={`${item.month}-${item.mode}`}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {formatMonth(item.month)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {paymentModeLabel(item.mode)} · {item.count} payment(s)
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {formatCurrency(item.amount)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
