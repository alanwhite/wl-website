import { z } from "zod";
import type { RegistrationField } from "@/lib/config";

export function buildRegistrationSchema(fields: RegistrationField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    if (field.type === "file") continue; // handled separately

    let schema: z.ZodTypeAny;

    switch (field.type) {
      case "checkbox":
        schema = z.boolean();
        if (field.required) {
          schema = z.boolean().refine((v) => v === true, {
            message: `${field.label} is required`,
          });
        }
        break;
      default:
        schema = field.required
          ? z.string().min(1, `${field.label} is required`)
          : z.string().optional();
        break;
    }

    shape[field.name] = schema;
  }

  return z.object(shape);
}

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

export type ContactFormData = z.infer<typeof contactSchema>;
