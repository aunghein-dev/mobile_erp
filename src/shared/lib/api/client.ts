import axios, { type AxiosRequestConfig } from "axios";
import { ENV } from "@/app/config/env";
import { useAuthStore } from "@/shared/store/useAuthStore";

export const api = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: true,
});

function normalizeTokenCandidate(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const token = trimmed.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

function resolveRequestToken() {
  const sessionToken = normalizeTokenCandidate(useAuthStore.getState().sessionToken);
  return sessionToken ?? ENV.AUTH_TOKEN ?? null;
}

function isMultipartPayload(value: unknown) {
  if (typeof FormData !== "undefined" && value instanceof FormData) {
    return true;
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as { append?: unknown; _parts?: unknown };
  return typeof candidate.append === "function" && Array.isArray(candidate._parts);
}

api.interceptors.request.use((config) => {
  const requestToken = resolveRequestToken();
  if (requestToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${requestToken}`;
  }

  const isMultipart = isMultipartPayload(config.data);
  if (isMultipart && config.headers) {
    delete (config.headers as Record<string, unknown>)["Content-Type"];
    delete (config.headers as Record<string, unknown>)["content-type"];
    if (typeof (config.headers as { set?: (key: string, value?: string) => void }).set === "function") {
      (config.headers as { set: (key: string, value?: string) => void }).set("Content-Type", undefined);
      (config.headers as { set: (key: string, value?: string) => void }).set("content-type", undefined);
    }
  } else if (
    config.headers &&
    config.data != null &&
    String(config.method ?? "get").toLowerCase() !== "get" &&
    String(config.method ?? "get").toLowerCase() !== "head" &&
    !config.headers["Content-Type"] &&
    !config.headers["content-type"]
  ) {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const config = error?.config as
      | (Record<string, unknown> & {
          headers?: unknown;
          __retryWithEnvToken?: boolean;
          __networkRetryCount?: number;
        })
      | undefined;

    const code = String(error?.code ?? "").toUpperCase();
    const isNetworkError =
      !status &&
      (code === "ERR_NETWORK" ||
        code === "ECONNABORTED" ||
        code === "ENOTFOUND" ||
        code === "ETIMEDOUT" ||
        String(error?.message ?? "").toLowerCase().includes("network error"));

    if (isNetworkError && config) {
      const retryCount = Number(config.__networkRetryCount ?? 0);
      if (retryCount < 2) {
        const retryConfig = config as AxiosRequestConfig & { __networkRetryCount?: number };
        retryConfig.__networkRetryCount = retryCount + 1;
        await new Promise((resolve) => {
          setTimeout(resolve, retryCount === 0 ? 280 : 620);
        });
        return api.request(retryConfig);
      }
    }

    if (status === 401 && config && !config.__retryWithEnvToken) {
      const sessionToken = normalizeTokenCandidate(useAuthStore.getState().sessionToken);
      const envToken = ENV.AUTH_TOKEN;
      if (sessionToken && envToken && sessionToken !== envToken) {
        const retryConfig = config as AxiosRequestConfig & {
          __retryWithEnvToken?: boolean;
          headers?: unknown;
        };
        retryConfig.__retryWithEnvToken = true;
        useAuthStore.getState().setSession({ authenticated: true, token: envToken });
        if (!retryConfig.headers || typeof retryConfig.headers !== "object") {
          retryConfig.headers = {};
        }
        (retryConfig.headers as Record<string, unknown>).Authorization = `Bearer ${envToken}`;
        return api.request(retryConfig);
      }
    }

    if (status === 401) {
      useAuthStore.getState().markUnauthorized();
    }
    return Promise.reject(error);
  }
);
