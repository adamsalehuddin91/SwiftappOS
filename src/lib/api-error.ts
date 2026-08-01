/**
 * Turn an API error body into a string safe to hand to toast()/JSX.
 *
 * Validation failures return `{ error: zodError.flatten() }`, i.e. an object
 * shaped `{ formErrors, fieldErrors }`. Passing that straight to a React child
 * throws "Objects are not valid as a React child" (minified error #31), which
 * crashes the page and hides the very message the user needed to read.
 */
type ZodFlattened = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

function isZodFlattened(value: unknown): value is ZodFlattened {
  return (
    typeof value === "object" &&
    value !== null &&
    ("fieldErrors" in value || "formErrors" in value)
  );
}

export function apiErrorMessage(body: unknown, fallback: string): string {
  const error = (body as { error?: unknown } | null)?.error;

  if (typeof error === "string" && error.trim()) return error;

  if (isZodFlattened(error)) {
    const form = error.formErrors?.filter(Boolean) ?? [];
    const fields = Object.entries(error.fieldErrors ?? {}).flatMap(
      ([field, messages]) => (messages ?? []).map((m) => `${field}: ${m}`)
    );
    const all = [...form, ...fields];
    if (all.length) return all.slice(0, 3).join(" · ");
  }

  return fallback;
}
