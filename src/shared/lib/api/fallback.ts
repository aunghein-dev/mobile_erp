import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { api } from "@/shared/lib/api/client";

type StatusCode = number | undefined;

function shouldTryNext(status: StatusCode) {
  return status === 400 || status === 404 || status === 405 || status === 500 || status === 501;
}

export async function getWithFallback<T>(
  urls: string[],
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  const tried = new Set<string>();
  let lastError: unknown;

  for (const rawUrl of urls) {
    const url = rawUrl.trim();
    if (!url || tried.has(url)) continue;
    tried.add(url);

    try {
      return await api.get<T>(url, config);
    } catch (error) {
      lastError = error;
      if (!axios.isAxiosError(error)) continue;
      const status = error.response?.status;
      if (!shouldTryNext(status)) {
        throw error;
      }
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Request failed for all endpoint variants");
}
