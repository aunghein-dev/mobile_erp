type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

export function appendJsonPart(formData: FormData, field: string, value: JsonValue) {
  const json = JSON.stringify(value);

  try {
    const blob = new Blob([json], { type: "application/json" });
    formData.append(field, blob);
  } catch {
    // Fallback for runtimes where Blob multipart JSON parts are not available.
    formData.append(field, json);
  }
}
