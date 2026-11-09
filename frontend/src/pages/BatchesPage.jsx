import { useCallback, useEffect, useState } from "react";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import { Checkbox, Field, Select, TextInput } from "../components/Field.jsx";
import { BookIcon, ChevronRightIcon, EditIcon, PlusIcon } from "../components/Icons.jsx";
import Modal from "../components/Modal.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { EmptyState, ErrorState, LoadingBlock } from "../components/States.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../services/api.js";
import { DAYS, GRADES } from "../utils/constants.js";
import { dayLabel, formatCurrency, gradeLabel } from "../utils/format.js";

const EMPTY = {
  name: "",
  grades: [],
  startTime: "17:00",
  endTime: "18:30",
  daysOfWeek: [1, 2, 3, 4, 5],
  isActive: true,
};

export default function BatchesPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.batches.list({ limit: 100 });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(batch) {
    setEditing(batch);
    setForm({
      name: batch.name,
      grades: batch.grades || [],
      startTime: batch.startTime,
      endTime: batch.endTime,
      daysOfWeek: batch.daysOfWeek || [],
      isActive: batch.isActive,
    });
    setFormError("");
    setFormOpen(true);
  }

  function toggleArray(key, value) {
    setForm((current) => {
      const list = current[key];
      const next = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
      return { ...current, [key]: next };
    });
  }

  async function save(event) {
    event.preventDefault();
    setFormError("");
    if (!form.name.trim()) {
      setFormError("Batch name is required.");
      return;
    }
    if (form.startTime >= form.endTime) {
      setFormError("End time must be after start time.");
      return;
    }
    if (!form.daysOfWeek.length) {
      setFormError("Select at least one day of the week.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.batches.update(editing._id, form);
        showToast("Batch updated");
      } else {
        await api.batches.create(form);
        showToast("Batch created");
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStudents(batchId) {
    if (expanded?.batch?._id === batchId) {
      setExpanded(null);
      return;
    }
    setExpandedLoading(true);
    try {
      const result = await api.batches.get(batchId);
      setExpanded(result);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setExpandedLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Batches"
        subtitle="Organise students by tuition batch"
        back
        backTo="/more"
        action={
          <Button size="sm" onClick={openCreate}>
            <PlusIcon className="h-4 w-4" />
            Add
          </Button>
        }
      />

      {loading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={BookIcon}
          title="No batches yet"
          description="Create a batch to group students by class timing."
          action={
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              Create Batch
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {data.items.map((batch) => (
            <div key={batch._id} className="card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{batch.name}</h2>
                      <Badge tone={batch.isActive ? "active" : "inactive"}>
                        {batch.isActive ? "active" : "inactive"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {batch.startTime}–{batch.endTime} ·{" "}
                      {(batch.daysOfWeek || []).map(dayLabel).join(", ") || "No days set"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {batch.studentCount} active student(s)
                      {batch.grades?.length
                        ? ` · Classes ${batch.grades.join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(batch)}
                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="Edit batch"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => toggleStudents(batch._id)}
                  className="mt-3 flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {expanded?.batch?._id === batch._id ? "Hide students" : "View students"}
                  <ChevronRightIcon
                    className={`h-4 w-4 transition ${
                      expanded?.batch?._id === batch._id ? "rotate-90" : ""
                    }`}
                  />
                </button>
              </div>

              {expanded?.batch?._id === batch._id && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                  {expandedLoading ? (
                    <p className="text-sm text-slate-500">Loading students…</p>
                  ) : expanded.students.length === 0 ? (
                    <p className="text-sm text-slate-500">No active students in this batch.</p>
                  ) : (
                    <ul className="divide-y divide-slate-200">
                      {expanded.students.map((student) => (
                        <li
                          key={student._id}
                          className="flex items-center justify-between gap-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {student.personalInfo.fullName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {student.studentCode} ·{" "}
                              {gradeLabel(student.academicInfo.grade)}
                            </p>
                          </div>
                          <p className="text-xs font-semibold text-slate-600">
                            {formatCurrency(student.tuitionInfo.monthlyFee)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        title={editing ? "Edit Batch" : "New Batch"}
        subtitle="Batch timing and class days"
        onClose={saving ? undefined : () => setFormOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button fullWidth onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create batch"}
            </Button>
          </div>
        }
      >
        <form onSubmit={save} className="space-y-4">
          {formError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}
          <Field label="Batch name" required>
            <TextInput
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="e.g. Evening 8–9"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time" required>
              <TextInput
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startTime: event.target.value }))
                }
              />
            </Field>
            <Field label="End time" required>
              <TextInput
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endTime: event.target.value }))
                }
              />
            </Field>
          </div>
          <Field label="Class days" required>
            <div className="grid grid-cols-4 gap-2">
              {DAYS.map((day) => (
                <Checkbox
                  key={day.value}
                  label={day.label}
                  checked={form.daysOfWeek.includes(day.value)}
                  onChange={() => toggleArray("daysOfWeek", day.value)}
                />
              ))}
            </div>
          </Field>
          <Field label="Supported grades">
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map((grade) => (
                <Checkbox
                  key={grade}
                  label={`Class ${grade}`}
                  checked={form.grades.includes(grade)}
                  onChange={() => toggleArray("grades", grade)}
                />
              ))}
            </div>
          </Field>
          <Field label="Status">
            <Select
              value={form.isActive ? "active" : "inactive"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.value === "active",
                }))
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
