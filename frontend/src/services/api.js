const API_BASE = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path, params) {
  const url = `${API_BASE}${path}`;
  if (!params) return url;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  }
  const qs = query.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request(path, { method = "GET", body, params } = {}) {
  const options = {
    method,
    credentials: "include",
    headers: {},
  };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path, params), options);
  } catch {
    throw new ApiError(
      "Cannot reach the server. Check your connection and try again.",
      0,
      "NETWORK_ERROR"
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    throw new ApiError(
      payload?.error?.message || `Request failed (${response.status})`,
      response.status,
      payload?.error?.code || "REQUEST_FAILED",
      payload?.error?.details || null
    );
  }

  return payload;
}

async function download(path, params, fallbackName = "download") {
  const response = await fetch(buildUrl(path, params), {
    credentials: "include",
  });
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("auth:unauthorized"));
    let message = `Download failed (${response.status})`;
    try {
      const data = await response.json();
      message = data?.error?.message || message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, response.status, "DOWNLOAD_FAILED");
  }

  const disposition = response.headers.get("content-disposition") || "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] || fallbackName;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return filename;
}

export const api = {
  auth: {
    login: (body) => request("/auth/login", { method: "POST", body }),
    logout: () => request("/auth/logout", { method: "POST" }),
    me: () => request("/auth/me"),
  },
  students: {
    list: (params) => request("/students", { params }),
    get: (id) => request(`/students/${id}`),
    create: (body) => request("/students", { method: "POST", body }),
    update: (id, body) => request(`/students/${id}`, { method: "PUT", body }),
    setStatus: (id, status) =>
      request(`/students/${id}/status`, { method: "PATCH", body: { status } }),
    checkDuplicate: (params) => request("/students/check-duplicate", { params }),
  },
  batches: {
    list: (params) => request("/batches", { params }),
    get: (id) => request(`/batches/${id}`),
    create: (body) => request("/batches", { method: "POST", body }),
    update: (id, body) => request(`/batches/${id}`, { method: "PUT", body }),
  },
  fees: {
    list: (params) => request("/fees", { params }),
    get: (id) => request(`/fees/${id}`),
    student: (studentId) => request(`/fees/student/${studentId}`),
    generate: (body) => request("/fees/generate", { method: "POST", body }),
    update: (id, body) => request(`/fees/${id}`, { method: "PUT", body }),
  },
  payments: {
    list: (params) => request("/payments", { params }),
    create: (body) => request("/payments", { method: "POST", body }),
    reverse: (id, reason) =>
      request(`/payments/${id}/reverse`, { method: "POST", body: { reason } }),
  },
  attendance: {
    list: (params) => request("/attendance", { params }),
    bulk: (body) => request("/attendance/bulk", { method: "POST", body }),
    update: (id, body) => request(`/attendance/${id}`, { method: "PUT", body }),
  },
  reports: {
    dashboard: (params) => request("/reports/dashboard", { params }),
    fees: (params) => request("/reports/fees", { params }),
    outstanding: (params) => request("/reports/outstanding", { params }),
    attendance: (params) => request("/reports/attendance", { params }),
    collection: (params) => request("/reports/collection", { params }),
  },
  settings: {
    get: () => request("/settings"),
    update: (body) => request("/settings", { method: "PUT", body }),
  },
  exports: {
    students: (params) => download("/exports/students.xlsx", params, "students.xlsx"),
    fees: (params) => download("/exports/fees.xlsx", params, "fees.xlsx"),
    payments: (params) =>
      download("/exports/payments.xlsx", params, "payments.xlsx"),
    attendance: (params) =>
      download("/exports/attendance.xlsx", params, "attendance.xlsx"),
  },
  backup: {
    export: () => download("/backup/export", null, "sharma-tuition-backup.json"),
  },
};

export default api;
