function normalizeAuthToken(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const token = trimmed.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const rawAuthToken = process.env.EXPO_PUBLIC_AUTH_TOKEN;

export const ENV = {
  API_URL: (rawApiUrl && rawApiUrl.replace(/\/+$/, "")) || "https://api.openwaremyanmar.site",
  AUTH_TOKEN: normalizeAuthToken(rawAuthToken),
};

if (!rawApiUrl) {
  console.warn(
    "EXPO_PUBLIC_API_URL is missing. Falling back to https://api.openwaremyanmar.site."
  );
}
