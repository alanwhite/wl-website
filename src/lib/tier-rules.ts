import { getTierRules, type TierRule } from "./config";
import { prisma } from "./prisma";

/**
 * Evaluate tier suggestion rules against submitted registration data.
 * Returns the suggested tier ID, or null if no rules are configured.
 */
export async function evaluateTierSuggestion(
  customFields: Record<string, unknown>,
): Promise<string | null> {
  const config = await getTierRules();
  if (!config) return null;

  for (const rule of config.rules) {
    const rawValue = extractFieldValue(customFields, rule.field);
    if (rawValue === undefined || rawValue === null) continue;

    const value = String(rawValue).trim();
    if (!value) continue;

    if (matchesRule(value, rule)) {
      const tier = await prisma.membershipTier.findFirst({
        where: { slug: rule.tierSlug },
      });
      return tier?.id ?? null;
    }
  }

  // No rule matched — use default
  const defaultTier = await prisma.membershipTier.findFirst({
    where: { slug: config.defaultTierSlug },
  });
  return defaultTier?.id ?? null;
}

function matchesRule(value: string, rule: TierRule): boolean {
  const normalized = value.toLowerCase();
  switch (rule.operator) {
    case "starts-with":
      return normalized.startsWith(String(rule.value).toLowerCase());
    case "equals":
      return normalized === String(rule.value).toLowerCase();
    case "matches":
      return new RegExp(String(rule.value), "i").test(value);
    case "in":
      if (!Array.isArray(rule.value)) return false;
      return rule.value.some(
        (v) => v.toLowerCase().replace(/\s+/g, " ").trim() ===
          normalized.replace(/\s+/g, " "),
      );
    default:
      return false;
  }
}

/**
 * Extract a value from customFields using a dotted path.
 * Handles JSON strings (e.g., address fields stored as serialized JSON).
 *
 * Examples:
 *   "firstName" → customFields.firstName
 *   "address.postcode" → JSON.parse(customFields.address).postcode
 */
function extractFieldValue(
  fields: Record<string, unknown>,
  path: string,
): unknown {
  const parts = path.split(".");
  let current: unknown = fields;

  for (let i = 0; i < parts.length; i++) {
    if (current == null || typeof current !== "object") return undefined;

    const part = parts[i];
    let value = (current as Record<string, unknown>)[part];

    // If the value is a JSON string and we have more path parts to traverse, parse it
    if (typeof value === "string" && i < parts.length - 1) {
      try {
        value = JSON.parse(value);
      } catch {
        // Not JSON, can't traverse further
        return undefined;
      }
    }

    current = value;
  }

  return current;
}
