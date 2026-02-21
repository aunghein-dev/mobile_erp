import { api } from "./client";

export async function fetcher<T>(url: string): Promise<T> {
  const response = await api.get<T>(url, { withCredentials: true });
  return response.data;
}
