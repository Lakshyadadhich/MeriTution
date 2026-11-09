import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { Field, Select, TextInput } from "../components/Field.jsx";
import { SearchIcon, WalletIcon } from "../components/Icons.jsx";
import Modal from "../components/Modal.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Segmented from "../components/Segmented.jsx";
import { EmptyState, ErrorState, LoadingBlock } from "../components/States.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../services/api.js";
import {
  currentMonth,
  formatCurrency,
  formatMonth,
  gradeLabel,
  monthOptions,
  paiseToRupees,
  rupeesToPaise,
} from "../utils/format.js";

const TABS = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
];

export default function FeesPage() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [adjusting, setAdjusting] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ baseAmount: "", discountAmount: "", dueDate: "" });
  const [adjustError, setAdjustError] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.fees.list({ feeMonth: month, limit: 200 });
      setItems(result.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (status === "all") setSearchParams({}, { replace: true });
    else setSearchParams({ status }, { replace: true });
  }, [status, setSearchParams]);

  async function generate() {
    setGenerating(true);
    try {
      const result = await api.fees.generate({ feeMonth: month });
      showToast(
        `Fees generated for ${formatMonth(month)}: ${result.created} created, ${result.skipped} already existed`
      );
      setGenerateOpen(false);
      await load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setGenerating(false);
    }
  }

  function openAdjust(fee) {
    setAdjusting(fee);
    setAdjustForm({
      baseAmount: String(paiseToRupees(fee.baseAmount)),
      discountAmount: String(paiseToRupees(fee.discountAmount)),
      dueDate: fee.dueDate ? fee.dueDate.slice(0, 10) : "",
    });
    setAdjustError("");
  }

  async function saveAdjust() {
    setAdjustError("");
    const base = Number(adjustForm.baseAmount);
    const discount = Number(adjustForm.discountAmount || 0);
    if (Number.isNaN(base) || base < 0) {
      setAdjustError("Base amount must be zero or more.");
      return;
    }
    if (Number.isNaN(discount) || discount < 0) {
      setAdjustError("Discount must be zero or more.");
      return;
    }
    if (discount > base) {
      setAdjustError("Discount cannot exceed the base amount.");
      return;
    }
    setAdjustSaving(true);
    try {
      const payload = {
        discountAmount: rupeesToPaise(discount),
        dueDate: adjustForm.dueDate || undefined,
      };
      if (rupeesToPaise(base) !== adjusting.baseAmount) {
        payload.baseAmount = rupeesToPaise(base);
      }
      await api.fees.update(adjusting._id, payload);
      showToast("Fee record updated");
      setAdjusting(null);
      await load();
    } catch (err) {
      setAdjustError(err.message);
    } finally {
      setAdjustSaving(false);
    }
  }

  const counts = {
    all: items.length,
    unpaid: items.filter((fee) => fee.status === "unpaid").length,
    partial: items.filter((fee) => fee.status === "partial").length,
    paid: items.filter((fee) => fee.status === "paid").length,
  };

  const summary = items.reduce(
    (acc, fee) => {
      acc.totalDue += fee.totalDue;
      acc.paid += fee.amountPaid;
      acc.balance += fee.balanceAmount;
      return acc;
    },
    { totalDue: 0, paid: 0, balance: 0 }
  );

  const query = search.trim().toLowerCase();
  const visible = items.filter((fee) => {
    if (status !== "all" && fee.status !== status) return false;
    if (!query) return true;
    const name = fee.studentId?.personalInfo?.fullName?.toLowerCase() || "";
    const code = fee.studentId?.studentCode?.toLowerCase() || "";
    return name.includes(query) || code.includes(query);
  });

  return (
    <div>
      <PageHeader
        title="Fees"
        subtitle={formatMonth(month)}
        action={
          <Button size="sm" variant="secondary" onClick={() => setGenerateOpen(true)}>
            Generate
          </Button>
        }
      />

      <div className="card space-y-3 p-4">
        <Field label="Fee month">
          <Select value={month} onChange={(event) => setMonth(event.target.value)}>
            {monthOptions(18).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 py-2">
            <p className="text-sm font-bold text-slate-800">
              {formatCurrency(summary.totalDue)}
            </p>
            <p className="text-[11px] font-medium text-slate-500">Total due</p>
          </div>
          <div className="rounded-xl bg-emerald-50 py-2">
            <p className="text-sm font-bold text-emerald-700">
              {formatCurrency(summary.paid)}
            </p>
            <p className="text-[11px] font-medium text-emerald-700">Collected</p>
          </div>
          <div className="rounded-xl bg-red-50 py-2">
            <p className="text-sm font-bold text-red-700">
              {formatCurrency(summary.balance)}
            </p>
            <p className="text-[11px] font-medium text-red-700">Outstanding</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <TextInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student name or code"
            className="pl-10"
          />
        </div>

        <Segmented
          options={TABS.map((tab) => ({ ...tab, count: counts[tab.value] }))}
          value={status}
          onChange={setStatus}
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={WalletIcon}
            title={items.length === 0 ? "No fee records for this month" : "No matching fees"}
            description={
              items.length === 0
                ? "Generate monthly fees for active students, then record payments."
                : "Try a different filter or search."
            }
            action={
              items.length === 0 ? (
                <Button onClick={() => setGenerateOpen(true)}>Generate Monthly Fees</Button>
              ) : null
            }
          />
        ) : (
          <div className="space-y-2">
            {visible.map((fee) => {
              const student = fee.studentId;
              return (
                <div key={fee._id} className="card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {student?.personalInfo?.fullName || "Student"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student?.studentCode} · {gradeLabel(student?.academicInfo?.grade)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Due {formatCurrency(fee.totalDue)} · Paid{" "}
                        {formatCurrency(fee.amountPaid)}
                        {fee.discountAmount > 0
                          ? ` · Discount ${formatCurrency(fee.discountAmount)}`
                          : ""}
                      </p>
                    </div>
                    <Badge tone={fee.status}>{fee.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">
                      Balance {formatCurrency(fee.balanceAmount)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openAdjust(fee)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Adjust
                      </button>
                      {fee.balanceAmount > 0 && (
                        <Link
                          to={`/payments/new?feeRecordId=${fee._id}`}
                          className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                        >
                          Collect
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={generateOpen}
        title={`Generate fees for ${formatMonth(month)}?`}
        message="One fee record will be created for each active student using their current monthly fee. Existing records are not changed, so this is safe to run again."
        confirmLabel="Generate fees"
        loading={generating}
        onConfirm={generate}
        onClose={() => setGenerateOpen(false)}
      />

      <Modal
        open={Boolean(adjusting)}
        title="Adjust fee record"
        subtitle={
          adjusting?.studentId?.personalInfo?.fullName
            ? `${adjusting.studentId.personalInfo.fullName} · ${formatMonth(
                adjusting.feeMonth
              )}`
            : ""
        }
        onClose={adjustSaving ? undefined : () => setAdjusting(null)}
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setAdjusting(null)}
              disabled={adjustSaving}
            >
              Cancel
            </Button>
            <Button fullWidth onClick={saveAdjust} disabled={adjustSaving}>
              {adjustSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {adjustError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {adjustError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Base amount (₹)"
              hint="Editable only before any payment is recorded."
            >
              <TextInput
                type="number"
                min="0"
                step="1"
                value={adjustForm.baseAmount}
                onChange={(event) =>
                  setAdjustForm((current) => ({
                    ...current,
                    baseAmount: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Discount (₹)">
              <TextInput
                type="number"
                min="0"
                step="1"
                value={adjustForm.discountAmount}
                onChange={(event) =>
                  setAdjustForm((current) => ({
                    ...current,
                    discountAmount: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <Field label="Due date">
            <TextInput
              type="date"
              value={adjustForm.dueDate}
              onChange={(event) =>
                setAdjustForm((current) => ({ ...current, dueDate: event.target.value }))
              }
            />
          </Field>
          <p className="text-xs text-slate-500">
            Total due becomes {formatCurrency(
              Math.max(
                rupeesToPaise(Number(adjustForm.baseAmount || 0)) -
                  rupeesToPaise(Number(adjustForm.discountAmount || 0)),
                0
              )
            )}
            .
          </p>
        </div>
      </Modal>
    </div>
  );
}
