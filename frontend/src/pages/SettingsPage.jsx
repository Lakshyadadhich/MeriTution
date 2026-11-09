import { useEffect, useState } from "react";
import Button from "../components/Button.jsx";
import { Field, TextInput } from "../components/Field.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { ErrorState, LoadingBlock, SuccessNote } from "../components/States.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../services/api.js";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    tuitionName: "",
    academicYear: "",
    feeGenerationDay: "1",
    defaultDueDay: "5",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings
      .get()
      .then((result) => {
        const settings = result.settings;
        setForm({
          tuitionName: settings.tuitionName || "",
          academicYear: settings.academicYear || "",
          feeGenerationDay: String(settings.feeGenerationDay ?? 1),
          defaultDueDay: String(settings.defaultDueDay ?? 5),
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function update(key, value) {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const result = await api.settings.update({
        tuitionName: form.tuitionName.trim(),
        academicYear: form.academicYear.trim(),
        feeGenerationDay: Number(form.feeGenerationDay),
        defaultDueDay: Number(form.defaultDueDay),
      });
      const settings = result.settings;
      setForm({
        tuitionName: settings.tuitionName || "",
        academicYear: settings.academicYear || "",
        feeGenerationDay: String(settings.feeGenerationDay ?? 1),
        defaultDueDay: String(settings.defaultDueDay ?? 5),
      });
      setSaved(true);
      showToast("Settings saved");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBlock label="Loading settings…" />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Tuition profile and fee defaults" back />

      <form onSubmit={submit} className="space-y-4">
        <section className="card space-y-3 p-4">
          <h2 className="section-title">Tuition profile</h2>
          <Field label="Tuition name" required>
            <TextInput
              value={form.tuitionName}
              onChange={(event) => update("tuitionName", event.target.value)}
              placeholder="e.g. Sharma Tuition Classes"
            />
          </Field>
          <Field
            label="Academic year"
            required
            hint="Format YYYY-YY, for example 2026-27."
          >
            <TextInput
              value={form.academicYear}
              onChange={(event) => update("academicYear", event.target.value)}
              placeholder="2026-27"
            />
          </Field>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="section-title">Fee defaults</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fee generation day" hint="1–28">
              <TextInput
                type="number"
                min="1"
                max="28"
                value={form.feeGenerationDay}
                onChange={(event) => update("feeGenerationDay", event.target.value)}
              />
            </Field>
            <Field label="Default due day" hint="1–31">
              <TextInput
                type="number"
                min="1"
                max="31"
                value={form.defaultDueDay}
                onChange={(event) => update("defaultDueDay", event.target.value)}
              />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            Fees are generated manually from the Fees screen. These values describe your
            usual monthly schedule. Currency is INR and timezone is Asia/Kolkata.
          </p>
        </section>

        {error && <ErrorState message={error} />}
        {saved && <SuccessNote>Your settings are up to date.</SuccessNote>}

        <Button type="submit" fullWidth size="lg" disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </form>
    </div>
  );
}
