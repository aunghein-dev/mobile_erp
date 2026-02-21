import { formatBatchId, formatDate, formatDateTime, formatMoney } from "./format";

describe("format utils", () => {
  test("formatMoney rounds values with currency symbols", () => {
    expect(formatMoney(2500, "MMK")).toBe("Ks\u00A02,500");
    expect(formatMoney(100.6, "THB")).toBe("฿\u00A0101");
    expect(formatMoney(1020.1, "JPY")).toBe("JPY\u00A01,020");
  });

  test("formatDate returns fallback for invalid input", () => {
    expect(formatDate()).toBe("-");
    expect(formatDate("not-a-date")).toBe("-");
  });

  test("formatDate and formatDateTime return readable values", () => {
    const input = "2026-02-20T08:30:00.000Z";
    expect(formatDate(input)).toContain("2026");
    expect(formatDateTime(input)).toContain("2026");
  });

  test("formatBatchId returns uppercase short form", () => {
    expect(formatBatchId("abc123efg7890")).toBe("#ABC123EF");
    expect(formatBatchId("")).toBe("N/A");
    expect(formatBatchId(undefined, "NONE")).toBe("NONE");
  });
});
