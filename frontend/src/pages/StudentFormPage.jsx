import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { Field, Select, TextInput } from "../components/Field.jsx";
import { AlertIcon, UsersIcon } from "../components/Icons.jsx";
import Modal from "../components/Modal.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { ErrorState, LoadingBlock } from "../components/States.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../services/api.js";
import { GRADES } from "../utils/constants.js";
import { paiseToRupees, rupeesToPaise, todayISO } from "../utils/format.js";

const EMPTY_FORM = {
  fullName: "",
  dob: "",
  gender: "",
  fatherName: "",
  motherName: "",
  primaryContact: "",
  alternateContact: "",
  schoolName: "",
  grade: "1",
  academicYear: "",
  subjects: "",
  batchId: "",
  monthlyFee: "",
  dueDay: "5",
  joiningDate: todayISO(),
  status: "active",
};

export default function StudentFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);
  const [createdId, setCreatedId] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.batches.list({ status: "active", limit: 100 }),
      api.settings.get(),
      isEdit ? api.students.get(id) : Promise.resolve(null),
    ])
      .then(([batchResult, settingsResult, studentResult]) => {
        if (!active) return;
        setBatches(batchResult.items);
        const settings = settingsResult.settings;

        if (studentResult) {
          const s = studentResult.student;
          setForm({
            fullName: s.personalInfo.fullName || "",
            dob: s.personalInfo.dob ? s.personalInfo.dob.slice(0, 10) : "",
            gender: s.personalInfo.gender || "",
            fatherName: s.parentInfo.fatherName || "",
            motherName: s.parentInfo.motherName || "",
            primaryContact: s.parentInfo.primaryContact || "",
            alternateContact: s.parentInfo.alternateContact || "",
            schoolName: s.academicInfo.schoolName || "",
            grade: s.academicInfo.grade || "1",
            academicYear: s.academicInfo.academicYear || settings.academicYear,
            subjects: (s.academicInfo.subjects || []).join(", "),
            batchId: s.tuitionInfo.batchId || "",
            monthlyFee: String(paiseToRupees(s.tuitionInfo.monthlyFee)),
            dueDay: String(s.tuitionInfo.dueDay || settings.defaultDueDay || 5),
            joiningDate: s.tuitionInfo.joiningDate
              ? s.tuitionInfo.joiningDate.slice(0, 10)
              : todayISO(),
            status: s.status || "active",
          });
        } else {
          setForm((current) => ({
            ...current,
            academicYear: current.academicYear || settings.academicYear,
            dueDay: current.dueDay || String(settings.defaultDueDay || 5),
          }));
        }
      })
      .catch((err) => {
        if (active) setLoadError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate() {
    const errors = {};
    if (!form.fullName.trim()) errors.fullName = "Full name is required";
    if (!form.primaryContact.trim()) errors.primaryContact = "Primary contact is required";
    if (!form.grade) errors.grade = "Grade is required";
    if (form.monthlyFee === "" || Number.isNaN(Number(form.monthlyFee))) {
      errors.monthlyFee = "Monthly fee is required";
    } else if (Number(form.monthlyFee) < 0) {
      errors.monthlyFee = "Fee cannot be negative";
    }
    if (!form.joiningDate) errors.joiningDate = "Admission date is required";
    const due = Number(form.dueDay);
    if (!due || due < 1 || due > 31) errors.dueDay = "Due day must be 1–31";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;

    const payload = {
      personalInfo: {
        fullName: form.fullName.trim(),
        dob: form.dob || null,
        gender: form.gender || null,
      },
      parentInfo: {
        fatherName: form.fatherName.trim() || null,
        motherName: form.motherName.trim() || null,
        primaryContact: form.primaryContact.trim(),
        alternateContact: form.alternateContact.trim() || null,
      },
      academicInfo: {
        schoolName: form.schoolName.trim() || null,
        grade: form.grade,
        academicYear: form.academicYear.trim(),
        subjects: form.subjects
          .split(",")
          .map((subject) => subject.trim())
          .filter(Boolean),
      },
      tuitionInfo: {
        batchId: form.batchId || null,
        monthlyFee: rupeesToPaise(form.monthlyFee),
        dueDay: Number(form.dueDay),
        joiningDate: form.joiningDate,
      },
      status: form.status,
    };

    setSaving(true);
    try {
      const result = isEdit
        ? await api.students.update(id, payload)
        : await api.students.create(payload);
      showToast(isEdit ? "Student updated" : "Student added");
      const studentId = result.student._id;
      setCreatedId(studentId);
      if (result.duplicateWarnings?.length) {
        setDuplicateWarnings(result.duplicateWarnings);
      } else {
        navigate(`/students/${studentId}`);
      }
    } catch (err) {
      const details = Array.isArray(err.details)
        ? err.details.map((item) => item.message || item.reason).filter(Boolean)
        : [];
      setFormError(
        details.length ? `${err.message}: ${details.join(", ")}` : err.message
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBlock label="Loading student…" />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit Student" : "Add Student"}
        subtitle={isEdit ? "Update student details" : "Create a new student record"}
        back
        backTo={isEdit ? `/students/${id}` : "/students"}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <section className="card space-y-4 p-4">
          <h2 className="section-title">Personal</h2>
          <Field label="Full name" required error={fieldErrors.fullName}>
            <TextInput
              value={form.fullName}
              onChange={(event) => update("fullName", event.target.value)}
              placeholder="Student full name"
              autoComplete="name"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth">
              <TextInput
                type="date"
                value={form.dob}
                onChange={(event) => update("dob", event.target.value)}
              />
            </Field>
            <Field label="Gender">
              <Select
                value={form.gender}
                onChange={(event) => update("gender", event.target.value)}
              >
                <option value="">Not set</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </Field>
          </div>
        </section>

        <section className="card space-y-4 p-4">
          <h2 className="section-title">Parent / Guardian</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Father's name">
              <TextInput
                value={form.fatherName}
                onChange={(event) => update("fatherName", event.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field label="Mother's name">
              <TextInput
                value={form.motherName}
                onChange={(event) => update("motherName", event.target.value)}
                placeholder="Optional"
              />
            </Field>
          </div>
          <Field
            label="Primary contact"
            required
            error={fieldErrors.primaryContact}
            hint="Siblings may share the same parent number."
          >
            <TextInput
              type="tel"
              inputMode="tel"
              value={form.primaryContact}
              onChange={(event) => update("primaryContact", event.target.value)}
              placeholder="10-digit mobile number"
            />
          </Field>
          <Field label="Alternate contact">
            <TextInput
              type="tel"
              inputMode="tel"
              value={form.alternateContact}
              onChange={(event) => update("alternateContact", event.target.value)}
              placeholder="Optional"
            />
          </Field>
        </section>

        <section className="card space-y-4 p-4">
          <h2 className="section-title">Academic</h2>
          <Field label="School name">
            <TextInput
              value={form.schoolName}
              onChange={(event) => update("schoolName", event.target.value)}
              placeholder="Optional"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grade" required error={fieldErrors.grade}>
              <Select
                value={form.grade}
                onChange={(event) => update("grade", event.target.value)}
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Class {g}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Academic year">
              <TextInput
                value={form.academicYear}
                onChange={(event) => update("academicYear", event.target.value)}
                placeholder="2026-27"
              />
            </Field>
          </div>
          <Field label="Subjects" hint="Separate multiple subjects with commas.">
            <TextInput
              value={form.subjects}
              onChange={(event) => update("subjects", event.target.value)}
              placeholder="Maths, Science, English"
            />
          </Field>
        </section>

        <section className="card space-y-4 p-4">
          <h2 className="section-title">Tuition</h2>
          <Field label="Batch">
            <Select
              value={form.batchId}
              onChange={(event) => update("batchId", event.target.value)}
            >
              <option value="">No batch assigned</option>
              {batches.map((batch) => (
                <option key={batch._id} value={batch._id}>
                  {batch.name} ({batch.startTime}–{batch.endTime})
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Monthly fee (₹)"
              required
              error={fieldErrors.monthlyFee}
              hint={
                isEdit
                  ? "Changing this affects future fee records only."
                  : undefined
              }
            >
              <TextInput
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={form.monthlyFee}
                onChange={(event) => update("monthlyFee", event.target.value)}
                placeholder="2000"
              />
            </Field>
            <Field label="Fee due day" required error={fieldErrors.dueDay}>
              <TextInput
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                value={form.dueDay}
                onChange={(event) => update("dueDay", event.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Admission date" required error={fieldErrors.joiningDate}>
              <TextInput
                type="date"
                value={form.joiningDate}
                onChange={(event) => update("joiningDate", event.target.value)}
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(event) => update("status", event.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          </div>
        </section>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate(isEdit ? `/students/${id}` : "/students")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" fullWidth disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add student"}
          </Button>
        </div>
      </form>

      <Modal
        open={duplicateWarnings.length > 0}
        title="Possible duplicate"
        subtitle="The student was saved. Please review these similar records."
        onClose={() => navigate(`/students/${createdId || id}`)}
        footer={
          <Button
            fullWidth
            onClick={() => {
              setDuplicateWarnings([]);
              navigate(`/students/${createdId || id}`);
            }}
          >
            Continue
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Shared parent phone numbers are allowed, especially for siblings. Check
              whether this is the same student before continuing.
            </span>
          </div>
          <ul className="space-y-2">
            {duplicateWarnings.map((warning) => (
              <li key={warning.studentId} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-900">
                    {warning.fullName}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {warning.studentCode} · Class {warning.grade} ·{" "}
                  {warning.primaryContact}
                </p>
                <p className="mt-1 text-xs font-medium text-amber-700">
                  {warning.reasons.join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}

