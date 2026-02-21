import axios from "axios";
import { ENV } from "@/app/config/env";
import { api } from "@/shared/lib/api/client";
import { useAuthStore } from "@/shared/store/useAuthStore";

type MultipartMethod = "POST" | "PUT";

type SendMultipartParams = {
  method: MultipartMethod;
  url: string;
  formData: FormData;
  withCredentials?: boolean;
};

function normalizeTokenCandidate(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const token = trimmed.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

function resolveAuthToken() {
  const stateToken = normalizeTokenCandidate(useAuthStore.getState().sessionToken);
  return stateToken ?? ENV.AUTH_TOKEN ?? null;
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function toAbsoluteUrl(url: string) {
  if (isAbsoluteUrl(url)) return url;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${ENV.API_URL}${cleanPath}`;
}

function isNetworkAxiosError(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  const code = String(error.code ?? "").toUpperCase();
  return (
    !status &&
    (code === "ERR_NETWORK" ||
      code === "ECONNABORTED" ||
      code === "ENOTFOUND" ||
      code === "ETIMEDOUT" ||
      String(error.message ?? "").toLowerCase().includes("network error"))
  );
}

async function readResponseMessage(response: Response) {
  const raw = await response.text().catch(() => "");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { message?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {}
  return raw.trim() || null;
}

async function throwFetchError(response: Response) {
  const details = await readResponseMessage(response);
  const baseMessage = details || "Request failed";
  const error = new Error(`${baseMessage} (HTTP ${response.status})`) as Error & { status?: number };
  error.status = response.status;
  throw error;
}

export async function sendMultipartWithFallback({
  method,
  url,
  formData,
  withCredentials = true,
}: SendMultipartParams) {
  try {
    await api.request({
      method,
      url,
      data: formData,
      withCredentials,
    });
    return;
  } catch (error) {
    if (!isNetworkAxiosError(error)) {
      throw error;
    }
  }

  const authToken = resolveAuthToken();
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(toAbsoluteUrl(url), {
    method,
    headers,
    body: formData,
  });

  if (!response.ok) {
    await throwFetchError(response);
  }
}

export async function postMultipartWithFallback(
  url: string,
  formData: FormData,
  withCredentials = true
) {
  await sendMultipartWithFallback({
    method: "POST",
    url,
    formData,
    withCredentials,
  });
}

export async function putMultipartWithFallback(
  url: string,
  formData: FormData,
  withCredentials = true
) {
  await sendMultipartWithFallback({
    method: "PUT",
    url,
    formData,
    withCredentials,
  });
}
