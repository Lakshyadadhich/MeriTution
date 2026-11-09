import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import BrandMark from "../components/BrandMark.jsx";
import Button from "../components/Button.jsx";
import { Field, TextInput } from "../components/Field.jsx";
import { AlertIcon } from "../components/Icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const target = location.state?.from?.pathname || "/";
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || "Unable to log in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 via-slate-50 to-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandMark className="mx-auto h-16 w-16 drop-shadow-md" />
          <h1 className="mt-4 text-2xl font-bold leading-tight text-slate-900">
            Sharma Tuition Classes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to manage students, fees and attendance.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-5">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Field label="Email" required>
            <TextInput
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>

          <Field label="Password" required>
            <TextInput
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>

          <Button type="submit" fullWidth size="lg" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          This application has a single administrator account. Contact your administrator
          if you cannot sign in.
        </p>
      </div>
    </div>
  );
}
