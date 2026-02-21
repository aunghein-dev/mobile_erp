import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { rawApi } from "@/shared/lib/api/rawClient";
import { getErrorMessage } from "@/shared/lib/api/errors";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { useStorageStore } from "@/shared/store/useStorageStore";
import { useOfflineUserStore } from "@/shared/store/useOfflineUserStore";
import { useCurrencyStore } from "@/shared/store/useCurrencyStore";
import { routes } from "@/shared/lib/api/routes";

type LoginInput = {
  username: string;
  password: string;
};

type LoginResponse = {
  business: number | string | null;
  token?: string;
  accessToken?: string;
  jwt?: string;
  jwtToken?: string;
  bearerToken?: string;
  access_token?: string | null;
  [key: string]: unknown;
};

type HeaderShape = {
  get?: (name: string) => string | null | undefined;
  [key: string]: unknown;
};

function toHeaderString(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : String(entry ?? "")))
      .filter(Boolean)
      .join("; ");
  }
  return null;
}

function getHeaderValue(headers: HeaderShape | undefined, name: string) {
  if (!headers) return null;
  const fromGetterRaw =
    typeof headers.get === "function" ? headers.get(name) ?? headers.get(name.toLowerCase()) : null;
  const fromGetter = toHeaderString(fromGetterRaw);
  if (fromGetter) return fromGetter;
  return (
    toHeaderString(headers[name]) ??
    toHeaderString(headers[name.toLowerCase()]) ??
    toHeaderString(headers[name.toUpperCase()])
  );
}

function extractCookieToken(headers: HeaderShape | undefined) {
  const raw = getHeaderValue(headers, "set-cookie");
  if (!raw) return null;
  const match = raw.match(/(?:^|[;,]\s*)token=([^;,\s]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function extractCookieTokenFromRawHeaderString(rawHeaders: unknown) {
  if (typeof rawHeaders !== "string" || !rawHeaders.trim()) return null;
  const cookieMatches = rawHeaders.match(/set-cookie:\s*([^\r\n]+)/gi) ?? [];
  for (const line of cookieMatches) {
    const cookiePart = line.replace(/^set-cookie:\s*/i, "");
    const tokenMatch = cookiePart.match(/(?:^|[;,]\s*)token=([^;,\s]+)/i);
    if (!tokenMatch?.[1]) continue;
    try {
      return decodeURIComponent(tokenMatch[1]);
    } catch {
      return tokenMatch[1];
    }
  }
  return null;
}

function extractCookieTokenFromRequest(request: unknown) {
  if (!request || typeof request !== "object") return null;
  const source = request as {
    getAllResponseHeaders?: () => string;
    responseHeaders?: string;
    _responseHeaders?: string;
    _headers?: string;
  };

  const fromGetter =
    typeof source.getAllResponseHeaders === "function" ? source.getAllResponseHeaders() : null;
  const fromNamed =
    source.responseHeaders ?? source._responseHeaders ?? source._headers ?? null;

  return (
    extractCookieTokenFromRawHeaderString(fromGetter) ??
    extractCookieTokenFromRawHeaderString(fromNamed)
  );
}

function normalizeTokenCandidate(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const token = trimmed.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

function extractTokenFromRecord(record: Record<string, unknown>, depth: number): string | null {
  const tokenKeys = [
    "token",
    "accessToken",
    "access_token",
    "jwt",
    "jwtToken",
    "bearerToken",
    "idToken",
    "id_token",
  ];

  for (const key of tokenKeys) {
    const candidate = normalizeTokenCandidate(record[key]);
    if (candidate) return candidate;
  }

  if (depth <= 0) return null;

  for (const value of Object.values(record)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const nested = extractTokenFromRecord(value as Record<string, unknown>, depth - 1);
    if (nested) return nested;
  }

  return null;
}

function extractTokenFromPayload(payload: LoginResponse | null | undefined) {
  if (!payload) return null;
  return extractTokenFromRecord(payload as Record<string, unknown>, 2);
}

export function useLogin() {
  const auth = useAuthStore((s) => s.setSession);
  const signOut = useAuthStore((s) => s.signOut);
  const setBusiness = useBusinessStore((s) => s.setBusiness);
  const clearBusiness = useBusinessStore((s) => s.clearBusiness);
  const setStorage = useStorageStore((s) => s.setStorage);
  const clearCurrency = useCurrencyStore((s) => s.clearCurrency);

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      try {
        signOut();
        clearBusiness();
        clearCurrency();
        const response = await rawApi.post<LoginResponse>(
          routes.auth.login,
          {
            username: input.username,
            password: input.password,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            withCredentials: true,
          }
        );

        const parsedBizId = Number(response.data.business);
        const businessId = Number.isFinite(parsedBizId) && parsedBizId > 0 ? parsedBizId : null;
        if (businessId) {
          setBusiness(businessId);
        }

        const headerAuth = getHeaderValue(response.headers as HeaderShape | undefined, "authorization");
        const headerToken =
          normalizeTokenCandidate(headerAuth) ??
          normalizeTokenCandidate(
            getHeaderValue(response.headers as HeaderShape | undefined, "x-auth-token")
          ) ??
          normalizeTokenCandidate(
            getHeaderValue(response.headers as HeaderShape | undefined, "x-access-token")
          ) ??
          normalizeTokenCandidate(getHeaderValue(response.headers as HeaderShape | undefined, "token"));
        const cookieToken =
          extractCookieToken(response.headers as HeaderShape | undefined) ??
          extractCookieTokenFromRequest(response.request);
        let token =
          extractTokenFromPayload(response.data) ??
          headerToken ??
          cookieToken ??
          null;

        if (!token) {
          try {
            const infoResponse = await rawApi.get<Record<string, unknown>>(routes.auth.info, {
              withCredentials: true,
            });
            const infoHeaderToken =
              normalizeTokenCandidate(
                getHeaderValue(infoResponse.headers as HeaderShape | undefined, "authorization")
              ) ??
              normalizeTokenCandidate(
                getHeaderValue(infoResponse.headers as HeaderShape | undefined, "x-auth-token")
              ) ??
              normalizeTokenCandidate(
                getHeaderValue(infoResponse.headers as HeaderShape | undefined, "x-access-token")
              ) ??
              normalizeTokenCandidate(
                getHeaderValue(infoResponse.headers as HeaderShape | undefined, "token")
              );
            const infoCookieToken =
              extractCookieToken(infoResponse.headers as HeaderShape | undefined) ??
              extractCookieTokenFromRequest(infoResponse.request);
            token =
              extractTokenFromRecord(infoResponse.data as Record<string, unknown>, 1) ??
              infoHeaderToken ??
              infoCookieToken ??
              token;
          } catch {}
        }

        if (!token) {
          throw new Error(
            "Login succeeded but token was not returned. Please return token in /auth/login response body."
          );
        }
        auth({ authenticated: true, token });

        if (businessId) {
          try {
            const storageResponse = await api.get(routes.billing.storage(businessId), {
              withCredentials: true,
            });
            setStorage(storageResponse.data);
          } catch {}
        }

        return response.data;
      } catch (error) {
        throw new Error(getErrorMessage(error, "Unable to sign in"));
      }
    },
  });
}

export function useLogout() {
  const signOut = useAuthStore((s) => s.signOut);
  const clearBusiness = useBusinessStore((s) => s.clearBusiness);
  const clearUser = useOfflineUserStore((s) => s.clear);
  const clearStorage = useStorageStore((s) => s.clearStorage);
  const clearCurrency = useCurrencyStore((s) => s.clearCurrency);

  return useMutation({
    mutationFn: async () => {
      await api.post(
        routes.auth.logout,
        {},
        {
          withCredentials: true,
        }
      );
    },
    onSettled: () => {
      signOut();
      clearBusiness();
      clearUser();
      clearStorage();
      clearCurrency();
    },
  });
}
