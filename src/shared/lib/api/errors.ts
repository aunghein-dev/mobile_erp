import axios from "axios";

export function getErrorMessage(error: unknown, fallback = "Request failed") {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message =
      (typeof error.response?.data === "object" && error.response?.data && "message" in error.response.data
        ? String((error.response.data as { message?: unknown }).message ?? "")
        : "") ||
      error.response?.statusText ||
      error.message;
    const resolved = message || fallback;
    return status ? `${resolved} (HTTP ${status})` : resolved;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
