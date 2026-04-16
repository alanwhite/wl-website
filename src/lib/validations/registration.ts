import { z } from "zod";
import type { RegistrationField, RegistrationFieldCondition } from "@/lib/config";

function isConditionMet(
  condition: RegistrationFieldCondition,
  data: Record<string, unknown>,
): boolean {
  const actual = String(data[condition.field] ?? "");
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

export function buildRegistrationSchema(fields: RegistrationField[]) {
  // Build a permissive base schema (all conditional fields optional)
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    if (field.type === "file") continue;

    let schema: z.ZodTypeAny;

    switch (field.type) {
      case "checkbox":
        schema = field.required && !field.showWhen
          ? z.boolean().refine((v) => v === true, { message: `${field.label} is required` })
          : z.boolean().optional();
        break;
      case "address":
        schema = field.required && !field.showWhen
          ? z.string().min(1, `${field.label} is required`).refine(
              (val) => {
                try { const p = JSON.parse(val); return p.postcode && p.line1; }
                catch { return false; }
              },
              { message: `${field.label}: please enter your postcode and address` },
            )
          : z.string().optional();
        break;
      default:
        schema = field.required && !field.showWhen
          ? z.string().min(1, `${field.label} is required`)
          : z.string().optional();
        break;
    }

    shape[field.name] = schema;
  }

  const baseSchema = z.object(shape);

  // Add a superRefine pass to validate conditional fields when their condition is met
  return baseSchema.superRefine((data, ctx) => {
    for (const field of fields) {
      if (field.type === "file") continue;
      if (!field.showWhen || !field.required) continue;

      // Check if the condition is met (field should be visible)
      if (!isConditionMet(field.showWhen, data)) continue;

      const value = data[field.name];

      if (field.type === "address") {
        if (!value || typeof value !== "string" || value.trim() === "") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${field.label} is required`, path: [field.name] });
          continue;
        }
        try {
          const parsed = JSON.parse(value);
          if (!parsed.postcode || !parsed.line1) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${field.label}: please enter your postcode and address`, path: [field.name] });
          }
        } catch {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${field.label}: please enter your postcode and address`, path: [field.name] });
        }
      } else if (field.type === "checkbox") {
        if (value !== true) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${field.label} is required`, path: [field.name] });
        }
      } else {
        if (!value || (typeof value === "string" && value.trim() === "")) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${field.label} is required`, path: [field.name] });
        }
      }
    }
  });
}

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

export type ContactFormData = z.infer<typeof contactSchema>;
