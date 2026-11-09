import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar.jsx";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import { Select, TextInput } from "../components/Field.jsx";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "../components/Icons.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { EmptyState, ErrorState, LoadingBlock } from "../components/States.jsx";
import api from "../services/api.js";
import { GRADES } from "../utils/constants.js";
import { gradeLabel } from "../utils/format.js";

export default function StudentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [grade, setGrade] = useState("");
  const [batchId, setBatchId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api.batches
      .list({ limit: 100 })
      .then((result) => setBatches(result.items))
      .catch(() => setBatches([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.students.list({
        q: query || undefined,
        status: status || undefined,
        grade: grade || undefined,
        batchId: batchId || undefined,
        page,
        limit: 20,
      });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query, status, grade, batchId, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={data ? `${data.pagination.total} student(s)` : "Manage student records"}
        action={
          <Button size="sm" onClick={() => navigate("/students/new")}>
            <PlusIcon className="h-4 w-4" />
            Add
          </Button>
        }
      />

      <div className="space-y-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <TextInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or parent contact"
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Status filter"
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Select
            value={grade}
            onChange={(event) => {
              setGrade(event.target.value);
              setPage(1);
            }}
            aria-label="Grade filter"
          >
            <option value="">All grades</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Class {g}
              </option>
            ))}
          </Select>
          <Select
            value={batchId}
            onChange={(event) => {
              setBatchId(event.target.value);
              setPage(1);
            }}
            aria-label="Batch filter"
          >
            <option value="">All batches</option>
            {batches.map((batch) => (
              <option key={batch._id} value={batch._id}>
                {batch.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4">
        {loading && !data ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No students found"
            description="Try changing the filters, or add a new student."
            action={
              <Button onClick={() => navigate("/students/new")}>
                <PlusIcon className="h-4 w-4" />
                Add Student
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {data.items.map((student) => (
              <Link
                key={student._id}
                to={`/students/${student._id}`}
                className="card flex items-center gap-3 p-3 transition hover:border-brand-200 active:scale-[0.995]"
              >
                <Avatar name={student.personalInfo.fullName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {student.personalInfo.fullName}
                    </p>
                    {student.status === "inactive" && (
                      <Badge tone="inactive">Inactive</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {student.studentCode} · {gradeLabel(student.academicInfo.grade)}
                    {student.batch?.name ? ` · ${student.batch.name}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {student.parentInfo.primaryContact}
                  </p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            ))}

            {data.pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </Button>
                <p className="text-xs font-medium text-slate-500">
                  Page {data.pagination.page} of {data.pagination.pages}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= data.pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
