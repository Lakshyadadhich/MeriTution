import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Avatar from "../components/Avatar.jsx";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { Field, Textarea } from "../components/Field.jsx";
import { AlertIcon, EditIcon, WalletIcon } from "../components/Icons.jsx";
import Modal from "../components/Modal.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { ErrorState, LoadingBlock } from "../components/States.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../services/api.js";
import {
  formatCurrency,
  formatDate,
  formatMonth,
  gradeLabel,
  paymentModeLabel,
} from "../utils/format.js";

function InfoRow({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value || "—"}</dd>
    </div>
  );
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusDialog, setStatusDialog] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [paymentToReverse, setPaymentToReverse] = useState(null);
  const [reverseReason, setReverseReason] = useState("");
  const [reverseError, setReverseError] = useState("");
  const [reversing, setReversing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.students.get(id);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus() {
    setStatusLoading(true);
    try {
      const next = data.student.status === "active" ? "inactive" : "active";
      await api.students.setStatus(id, next);
      showToast(next === "active" ? "Student reactivated" : "Student deactivated");
      setStatusDialog(false);
      await load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setStatusLoading(false);
    }
  }

  async function submitReverse() {
    setReverseError("");
    if (reverseReason.trim().length < 3) {
      setReverseError("Please enter a reason (at least 3 characters).");
      return;
    }
    setReversing(true);
    try {
      await api.payments.reverse(paymentToReverse._id, reverseReason.trim());
      showToast("Payment reversed and balances updated");
      setPaymentToReverse(null);
      setReverseReason("");
      await load();
    } catch (err) {
      setReverseError(err.message);
    } finally {
      setReversing(false);
    }
  }

  if (loading && !data) return <LoadingBlock label="Loading student…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const { student, feeRecords, payments, attendanceSummary, recentAttendance } = data;
  const attendancePercentage =
    attendanceSummary.total > 0
      ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100)
      : null;
  const totalOutstanding = feeRecords.reduce((sum, fee) => sum + fee.balanceAmount, 0);
  const hasOutstanding = feeRecords.some((fee) => fee.balanceAmount > 0);

  return (
    <div>
      <PageHeader
        title="Student Profile"
        subtitle={student.studentCode}
        back
        backTo="/students"
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate(`/students/${id}/edit`)}
          >
            <EditIcon className="h-4 w-4" />
            Edit
          </Button>
        }
      />

      <div className="space-y-4">
        <section className="card p-4">
          <div className="flex items-start gap-3">
            <Avatar name={student.personalInfo.fullName} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {student.personalInfo.fullName}
                </h2>
                <Badge tone={student.status}>{student.status}</Badge>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {gradeLabel(student.academicInfo.grade)}
                {student.batch?.name ? ` · ${student.batch.name}` : ""}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {student.parentInfo.primaryContact}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              onClick={() => navigate(`/payments/new?studentId=${id}`)}
              disabled={!hasOutstanding}
            >
              <WalletIcon className="h-4 w-4" />
              Collect Fee
            </Button>
            <Button
              variant={student.status === "active" ? "secondary" : "subtle"}
              onClick={() => setStatusDialog(true)}
            >
              {student.status === "active" ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
          {hasOutstanding && (
            <p className="mt-2 text-center text-xs text-slate-500">
              Outstanding: {formatCurrency(totalOutstanding)}
            </p>
          )}
        </section>

        <section className="card p-4">
          <h3 className="section-title">Details</h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoRow label="Admission date" value={formatDate(student.tuitionInfo.joiningDate)} />
            <InfoRow label="Monthly fee" value={formatCurrency(student.tuitionInfo.monthlyFee)} />
            <InfoRow label="Due day" value={`Day ${student.tuitionInfo.dueDay}`} />
            <InfoRow label="Academic year" value={student.academicInfo.academicYear} />
            <InfoRow label="School" value={student.academicInfo.schoolName} />
            <InfoRow label="Subjects" value={(student.academicInfo.subjects || []).join(", ")} />
            <InfoRow label="Father" value={student.parentInfo.fatherName} />
            <InfoRow label="Mother" value={student.parentInfo.motherName} />
            <InfoRow label="Alternate contact" value={student.parentInfo.alternateContact} />
            <InfoRow
              label="Date of birth"
              value={student.personalInfo.dob ? formatDate(student.personalInfo.dob) : null}
            />
          </dl>
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Attendance</h3>
            <p className="text-sm font-bold text-brand-700">
              {attendancePercentage === null ? "No records" : `${attendancePercentage}%`}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-emerald-50 py-2">
              <p className="text-lg font-bold text-emerald-700">{attendanceSummary.present}</p>
              <p className="text-[11px] font-medium text-emerald-700">Present</p>
            </div>
            <div className="rounded-xl bg-red-50 py-2">
              <p className="text-lg font-bold text-red-700">{attendanceSummary.absent}</p>
              <p className="text-[11px] font-medium text-red-700">Absent</p>
            </div>
            <div className="rounded-xl bg-sky-50 py-2">
              <p className="text-lg font-bold text-sky-700">{attendanceSummary.leave}</p>
              <p className="text-[11px] font-medium text-sky-700">Leave</p>
            </div>
          </div>
          {recentAttendance.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100">
              {recentAttendance.slice(0, 5).map((record) => (
                <li key={record._id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {formatDate(record.attendanceDate)}
                    </p>
                    <p className="text-xs text-slate-500">{record.batchId?.name || "Batch"}</p>
                  </div>
                  <Badge tone={record.status}>{record.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-900">Fee History</h3>
          </div>
          {feeRecords.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No fee records yet. Generate monthly fees from the Fees screen.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {feeRecords.map((fee) => (
                <li key={fee._id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatMonth(fee.feeMonth)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Due {formatDate(fee.dueDate)} · Paid {formatCurrency(fee.amountPaid)} of{" "}
                        {formatCurrency(fee.totalDue)}
                      </p>
                    </div>
                    <Badge tone={fee.status}>{fee.status}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">
                      Balance {formatCurrency(fee.balanceAmount)}
                    </p>
                    {fee.balanceAmount > 0 && (
                      <Link
                        to={`/payments/new?feeRecordId=${fee._id}`}
                        className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                      >
                        Collect
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-900">Payment History</h3>
          </div>
          {payments.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No payments recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <li key={payment._id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(payment.amount)}{" "}
                        <span className="font-normal text-slate-500">
                          · {paymentModeLabel(payment.paymentMode)}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {payment.receiptNumber} · {formatDate(payment.paymentDate)}
                      </p>
                      {payment.status === "reversed" && payment.reversalReason && (
                        <p className="mt-1 text-xs font-medium text-red-600">
                          Reversed: {payment.reversalReason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={payment.status}>{payment.status}</Badge>
                      {payment.status === "completed" && (
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentToReverse(payment);
                            setReverseReason("");
                            setReverseError("");
                          }}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Reverse
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={statusDialog}
        title={
          student.status === "active" ? "Deactivate student?" : "Reactivate student?"
        }
        message={
          student.status === "active"
            ? "The student will be excluded from future fee generation and attendance, but all history is preserved."
            : "The student will be included in future fee generation and attendance again."
        }
        confirmLabel={student.status === "active" ? "Deactivate" : "Reactivate"}
        variant={student.status === "active" ? "danger" : "primary"}
        loading={statusLoading}
        onConfirm={toggleStatus}
        onClose={() => setStatusDialog(false)}
      />

      <Modal
        open={Boolean(paymentToReverse)}
        title="Reverse payment"
        subtitle={
          paymentToReverse
            ? `${paymentToReverse.receiptNumber} · ${formatCurrency(paymentToReverse.amount)}`
            : ""
        }
        onClose={reversing ? undefined : () => setPaymentToReverse(null)}
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setPaymentToReverse(null)}
              disabled={reversing}
            >
              Cancel
            </Button>
            <Button variant="danger" fullWidth onClick={submitReverse} disabled={reversing}>
              {reversing ? "Reversing…" : "Reverse payment"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              The original transaction is kept for audit. Fee totals and balances will be
              recalculated immediately.
            </span>
          </div>
          <Field label="Reason" required error={reverseError}>
            <Textarea
              value={reverseReason}
              onChange={(event) => setReverseReason(event.target.value)}
              placeholder="Why is this payment being reversed?"
              rows={3}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
