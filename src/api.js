export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfResponse = await fetch("/api/auth/csrf", { credentials: "same-origin" });
    const csrfResult = await csrfResponse.json();
    if (!csrfResponse.ok) {
      throw new ApiError(csrfResult.error || "Could not start a secure request.", csrfResponse.status);
    }
    headers.set("X-CSRF-Token", csrfResult.csrfToken);
  }

  const response = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: "same-origin"
  });
  const result = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new ApiError(result?.error || "The request could not be completed.", response.status);
  }

  return result;
}
