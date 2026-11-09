import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import { Field, Select, TextInput } from "../components/Field.jsx";
import { CheckSquareIcon } from "../components/Icons.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { EmptyState, ErrorState, LoadingBlock } from "../components/States.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../services/api.js";
import { ATTENDANCE_STATUSES } from "../utils/constants.js";
import { classNames, gradeLabel, todayISO } from "../utils/format.js";

const STATUS_STYLES = {
  present: "bg-emerald-600 text-white",
  absent: "bg-red-600 text-white",
  leave: "bg-sky-600 text-white",
};

export default function AttendancePage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [students, setStudents] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.batches
      .list({ status: "active", limit: 100 })
      .then((result) => {
        setBatches(result.items);
        if (result.items.length > 0) {
          setBatchId((current) => current || result.items[0]._id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const load = useCallback(async () => {
    if (!batchId) {
      setStudents([]);
      setStatuses({});
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [batchResult, attendanceResult] = await Promise.all([
        api.batches.get(batchId),
        api.attendance.list({ batchId, attendanceDate: date, limit: 200 }),
      ]);
      const list = batchResult.students || [];
      setStudents(list);

      const next = {};
      for (const student of list) next[student._id] = null;
      for (const record of attendanceResult.items) {
        const studentId = record.studentId?._id || record.studentId;
        if (studentId && next[studentId] !== undefined) {
          next[studentId] = record.status;
        }
      }
      setStatuses(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [batchId, date]);

  useEffect(() => {
    load();
  }, [load]);

  function setStatus(studentId, status) {
    setStatuses((current) => ({ ...current, [studentId]: status }));
  }

  function markAllPresent() {
    const next = {};
    for (const student of students) next[student._id] = "present";
    setStatuses(next);
  }

  async function save() {
    const records = students
      .filter((student) => statuses[student._id])
      .map((student) => ({ studentId: student._id, status: statuses[student._id] }));
    if (records.length === 0) {
      showToast("Mark at least one student before saving.", "error");
      return;
    }
    setSaving(true);
    try {
      const result = await api.attendance.bulk({
        batchId,
        attendanceDate: date,
        records,
      });
      showToast(
        `Attendance saved: ${result.saved} student(s) (${result.created} new, ${result.updated} updated)`
      );
      await load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const counts = ATTENDANCE_STATUSES.reduce((acc, status) => {
    acc[status.value] = Object.values(statuses).filter(
      (value) => value === status.value
    ).length;
    return acc;
  }, {});
  const unmarked = students.filter((student) => !statuses[student._id]).length;
  const currentBatch = batches.find((batch) => batch._id === batchId);

  if (!loading && batches.length === 0) {
    return (
      <div>
        <PageHeader title="Attendance" subtitle="Daily batch attendance" />
        <EmptyState
          icon={CheckSquareIcon}
          title="No active batches"
          description="Create a batch and assign students before marking attendance."
          action={
            <Link
              to="/batches"
              className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Manage Batches
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle={currentBatch ? currentBatch.name : "Daily batch attendance"}
        action={
          <Button size="sm" onClick={save} disabled={saving || students.length === 0}>
            {saving ? "Saving…" : "Save"}
          </Button>
        }
      />

      <div className="card space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <TextInput
              type="date"
              value={date}
              max={todayISO()}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label="Batch">
            <Select value={batchId} onChange={(event) => setBatchId(event.target.value)}>
              {batches.map((batch) => (
                <option key={batch._id} value={batch._id}>
                  {batch.name} ({batch.startTime})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {currentBatch && (
          <p className="text-xs text-slate-500">
            {currentBatch.startTime}–{currentBatch.endTime} ·{" "}
            {(currentBatch.daysOfWeek || []).length} day(s)/week ·{" "}
            {students.length} student(s)
          </p>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : students.length === 0 ? (
          <EmptyState
            icon={CheckSquareIcon}
            title="No active students in this batch"
            description="Assign students to this batch from the student form."
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                  Present {counts.present}
                </span>
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">
                  Absent {counts.absent}
                </span>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">
                  Leave {counts.leave}
                </span>
                {unmarked > 0 && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                    Unmarked {unmarked}
                  </span>
                )}
              </div>
              <Button variant="subtle" size="sm" onClick={markAllPresent}>
                Mark all present
              </Button>
            </div>

            <div className="space-y-2">
              {students.map((student) => (
                <div key={student._id} className="card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {student.personalInfo.fullName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student.studentCode} · {gradeLabel(student.academicInfo.grade)}
                      </p>
                    </div>
                    {statuses[student._id] && (
                      <Badge tone={statuses[student._id]}>
                        {statuses[student._id]}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {ATTENDANCE_STATUSES.map((option) => {
                      const active = statuses[student._id] === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setStatus(student._id, option.value)}
                          className={classNames(
                            "rounded-lg px-2 py-1.5 text-xs font-semibold transition",
                            active
                              ? STATUS_STYLES[option.value]
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Button fullWidth size="lg" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
            <p className="pb-2 text-center text-xs text-slate-500">
              Attendance can be corrected for previous dates. One record is kept per
              student, batch and date.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
