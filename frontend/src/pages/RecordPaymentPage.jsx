import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import { Field, Select, Textarea, TextInput } from "../components/Field.jsx";
import { AlertIcon, PrinterIcon, ReceiptIcon, WalletIcon } from "../components/Icons.jsx";
import Modal from "../components/Modal.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { EmptyState, ErrorState, LoadingBlock } from "../components/States.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../services/api.js";
import { PAYMENT_MODES } from "../utils/constants.js";
import {
  currentMonth,
  formatCurrency,
  formatDate,
  formatMonth,
  gradeLabel,
  paiseToRupees,
  paymentModeLabel,
  rupeesToPaise,
  todayISO,
} from "../utils/format.js";

const EMPTY_FORM = {
  amount: "",
  paymentDate: todayISO(),
  paymentMode: "cash",
  reference: "",
  notes: "",
};

export default function RecordPaymentPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const feeRecordId = searchParams.get("feeRecordId");
  const studentId = searchParams.get("studentId");

  const [fee, setFee] = useState(null);
  const [payments, setPayments] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const settingsResult = await api.settings.get().catch(() => null);
        if (active && settingsResult) setSettings(settingsResult.settings);

        if (feeRecordId) {
          const result = await api.fees.get(feeRecordId);
          if (!active) return;
          setFee(result.fee);
          setPayments(result.payments);
          setStudentInfo(result.fee.studentId);
        } else if (studentId) {
          const result = await api.fees.student(studentId);
          if (!active) return;
          setStudentInfo(result.student);
          const outstanding = result.feeRecords.filter((item) => item.balanceAmount > 0);
          setCandidates(outstanding);
          if (outstanding.length === 1) {
            setFee(outstanding[0]);
          }
        } else {
          const result = await api.reports.outstanding({ feeMonth: currentMonth() });
          if (!active) return;
          setCandidates(result.items);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [feeRecordId, studentId]);

  useEffect(() => {
    if (fee) {
      setForm((current) => ({
        ...current,
        amount: String(paiseToRupees(fee.balanceAmount)),
        paymentDate: todayISO(),
      }));
      setPayments((current) => current);
    }
  }, [fee]);

  const student = useMemo(() => {
    if (!fee) return studentInfo;
    return fee.studentId && typeof fee.studentId === "object"
      ? fee.studentId
      : studentInfo;
  }, [fee, studentInfo]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setFormError("");
    if (!fee) {
      setFormError("Select a fee record first.");
      return;
    }
    const amount = Number(form.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setFormError("Enter a payment amount greater than zero.");
      return;
    }
    const amountPaise = rupeesToPaise(amount);
    if (amountPaise > fee.balanceAmount) {
      setFormError(
        `Amount exceeds the outstanding balance of ${formatCurrency(fee.balanceAmount)}.`
      );
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.payments.create({
        studentId: typeof fee.studentId === "string" ? fee.studentId : fee.studentId._id,
        feeRecordId: fee._id,
        amount: amountPaise,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        transactionReference: form.reference.trim() || null,
        notes: form.notes.trim() || null,
      });
      setReceipt({
        payment: result.payment,
        fee: result.fee,
        student,
        feeMonth: fee.feeMonth,
      });
      showToast(`Payment recorded · ${result.payment.receiptNumber}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function startAnother() {
    setReceipt(null);
    setForm({ ...EMPTY_FORM, paymentDate: todayISO() });
    if (feeRecordId || studentId) {
      navigate("/fees");
    } else {
      api.reports
        .outstanding({ feeMonth: currentMonth() })
        .then((result) => {
          setCandidates(result.items);
          setFee(null);
        })
        .catch((err) => setError(err.message));
    }
  }

  if (loading) return <LoadingBlock label="Loading fee details…" />;
  if (error) return <ErrorState message={error} />;

  const showPicker = !fee;

  return (
    <div>
      <PageHeader
        title="Collect Fee"
        subtitle={
          fee
            ? `${formatMonth(fee.feeMonth)} · ${formatCurrency(fee.balanceAmount)} outstanding`
            : "Select a fee to collect"
        }
        back
        backTo="/fees"
      />

      {showPicker ? (
        <div className="space-y-3">
          {candidates.length === 0 ? (
            <EmptyState
              icon={WalletIcon}
              title="No outstanding fees"
              description="There are no unpaid or partially paid fees for this month."
              action={
                <Link
                  to="/fees"
                  className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Go to Fees
                </Link>
              }
            />
          ) : (
            <>
              <p className="text-sm text-slate-500">
                Choose a fee record to collect payment against.
              </p>
              {candidates.map((item) => {
                const candidateStudent =
                  item.studentId && typeof item.studentId === "object"
                    ? item.studentId
                    : studentInfo;
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => setFee(item)}
                    className="card flex w-full items-center justify-between gap-3 p-3 text-left transition hover:border-brand-200"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {candidateStudent?.personalInfo?.fullName || "Student"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {candidateStudent?.studentCode} · {formatMonth(item.feeMonth)} ·{" "}
                        {gradeLabel(candidateStudent?.academicInfo?.grade)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">
                        {formatCurrency(item.balanceAmount)}
                      </p>
                      <Badge tone={item.status} className="mt-0.5">
                        {item.status}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <section className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-slate-900">
                  {student?.personalInfo?.fullName || "Student"}
                </p>
                <p className="text-xs text-slate-500">
                  {student?.studentCode} · {gradeLabel(student?.academicInfo?.grade)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatMonth(fee.feeMonth)} · Due {formatDate(fee.dueDate)}
                </p>
              </div>
              <Badge tone={fee.status}>{fee.status}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 py-2">
                <p className="text-sm font-bold text-slate-800">
                  {formatCurrency(fee.totalDue)}
                </p>
                <p className="text-[11px] text-slate-500">Total due</p>
              </div>
              <div className="rounded-xl bg-emerald-50 py-2">
                <p className="text-sm font-bold text-emerald-700">
                  {formatCurrency(fee.amountPaid)}
                </p>
                <p className="text-[11px] text-emerald-700">Paid</p>
              </div>
              <div className="rounded-xl bg-red-50 py-2">
                <p className="text-sm font-bold text-red-700">
                  {formatCurrency(fee.balanceAmount)}
                </p>
                <p className="text-[11px] text-red-700">Balance</p>
              </div>
            </div>
            {fee.discountAmount > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Discount applied: {formatCurrency(fee.discountAmount)}
              </p>
            )}
          </section>

          {fee.balanceAmount === 0 ? (
            <div className="card p-4 text-center">
              <p className="text-sm font-semibold text-emerald-700">
                This fee is fully paid.
              </p>
              <Button variant="secondary" className="mt-3" onClick={() => navigate("/fees")}>
                Back to Fees
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="card space-y-4 p-4">
              <h2 className="section-title">Payment details</h2>
              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount (₹)" required>
                  <TextInput
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => update("amount", event.target.value)}
                  />
                </Field>
                <Field label="Payment date" required>
                  <TextInput
                    type="date"
                    value={form.paymentDate}
                    max={todayISO()}
                    onChange={(event) => update("paymentDate", event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Payment mode" required>
                <Select
                  value={form.paymentMode}
                  onChange={(event) => update("paymentMode", event.target.value)}
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Transaction reference"
                hint="Optional: UPI reference, cheque number, etc."
              >
                <TextInput
                  value={form.reference}
                  onChange={(event) => update("reference", event.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Notes">
                <Textarea
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  placeholder="Optional"
                  rows={2}
                />
              </Field>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => navigate("/fees")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" fullWidth disabled={submitting}>
                  {submitting ? "Saving…" : "Record payment"}
                </Button>
              </div>
            </form>
          )}

          {payments.length > 0 && (
            <section className="card overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">Payments for this fee</h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <li key={payment._id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {formatCurrency(payment.amount)} ·{" "}
                        {paymentModeLabel(payment.paymentMode)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {payment.receiptNumber} · {formatDate(payment.paymentDate)}
                      </p>
                    </div>
                    <Badge tone={payment.status}>{payment.status}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <Modal
        open={Boolean(receipt)}
        title="Payment recorded"
        subtitle="Share or print this receipt"
        onClose={() => setReceipt(null)}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={startAnother}>
              Done
            </Button>
            <Button fullWidth onClick={() => window.print()}>
              <PrinterIcon className="h-4 w-4" />
              Print
            </Button>
          </div>
        }
      >
        {receipt && (
          <div className="print-area space-y-4">
            <div className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <ReceiptIcon className="h-5 w-5" />
              </div>
              <h3 className="mt-2 text-lg font-bold text-slate-900">
                {settings?.tuitionName || "Sharma Tuition Classes"}
              </h3>
              <p className="text-xs text-slate-500">Fee payment receipt</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Receipt no.</span>
                <span className="font-semibold">{receipt.payment.receiptNumber}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold">
                  {formatDate(receipt.payment.paymentDate)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Student</span>
                <span className="font-semibold">
                  {receipt.student?.personalInfo?.fullName || "Student"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Fee month</span>
                <span className="font-semibold">{formatMonth(receipt.feeMonth)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Mode</span>
                <span className="font-semibold">
                  {paymentModeLabel(receipt.payment.paymentMode)}
                </span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base">
                <span className="font-semibold text-slate-700">Amount paid</span>
                <span className="font-bold text-brand-800">
                  {formatCurrency(receipt.payment.amount)}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-xs">
                <span className="text-slate-500">Balance after payment</span>
                <span className="font-semibold">
                  {formatCurrency(receipt.fee.balanceAmount)}
                </span>
              </div>
            </div>
            <p className="text-center text-xs text-slate-500">
              Thank you. This receipt was generated by{" "}
              {settings?.tuitionName || "Sharma Tuition Classes"}.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
