import type { RegistrationField, RegistrationFieldCondition } from "./config";

/**
 * Evaluate a field's showWhen condition against a set of form values.
 * Returns true when the field should be visible.
 *
 * Used by registration forms, group member fields, and any other dynamic
 * field collection that supports per-field visibility rules.
 */
export function isFieldVisible(
  field: Pick<RegistrationField, "showWhen">,
  values: Record<string, unknown>,
): boolean {
  return evaluateCondition(field.showWhen, values);
}

function evaluateCondition(
  condition: RegistrationFieldCondition | undefined,
  values: Record<string, unknown>,
): boolean {
  if (!condition) return true;
  const actual = String(values[condition.field] ?? "");
  switch (condition.operator) {
    case "equals":
      return actual === condition.value;
    case "not-equals":
      return actual !== condition.value;
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(actual);
    case "not-in":
      return Array.isArray(condition.value) && !condition.value.includes(actual);
    default:
      return true;
  }
}
