export type VariantDraft = {
  id: string;
  itemColorHex: string;
  itemQuantity: number;
  barcodeNo: string;
  sizing: string;
  subPrice: number;
  imageUri: string | null;
};

export type WholesaleTierDraft = {
  id: string;
  minQuantity: number;
  price: number;
};

export function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createVariant(): VariantDraft {
  return {
    id: createId(),
    itemColorHex: "#000000",
    itemQuantity: 1,
    barcodeNo: "",
    sizing: "",
    subPrice: 0,
    imageUri: null,
  };
}

export function createTier(): WholesaleTierDraft {
  return {
    id: createId(),
    minQuantity: 0,
    price: 0,
  };
}

export function normalizeColorHex(value?: string | null) {
  if (!value) return "#8D9AAF";
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === "NULL") return "#8D9AAF";
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(trimmed) ? trimmed : "#8D9AAF";
}
