const CURRENCY_SYMBOLS: Record<string, string> = {
  MMK: "Ks",
  THB: "฿",
  USD: "$",
};

export function formatMoney(amount: number, currency = "MMK") {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  const formatted = new Intl.NumberFormat("en-US").format(rounded);
  const normalizedCurrency = String(currency || "MMK").trim().toUpperCase();
  const symbol = CURRENCY_SYMBOLS[normalizedCurrency];

  if (symbol) {
    return `${symbol}\u00A0${formatted}`;
  }

  if (normalizedCurrency) {
    return `${normalizedCurrency}\u00A0${formatted}`;
  }

  return formatted;
}

export function formatDate(dateString?: string | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(dateString?: string | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatBatchId(batchId?: string | null, fallback = "N/A") {
  if (!batchId) return fallback;
  const normalized = batchId.trim();
  if (!normalized) return fallback;
  return `#${normalized.toUpperCase().slice(0, 8)}`;
}
