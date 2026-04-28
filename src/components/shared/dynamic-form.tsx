"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RegistrationField, RegistrationFieldCondition } from "@/lib/config";
import { AddressField } from "./address-field";

interface DynamicFormProps {
  fields: RegistrationField[];
  defaultValues?: Record<string, unknown>;
}

function evaluateShowWhen(
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

export function DynamicFormFields({ fields, defaultValues }: DynamicFormProps) {
  const [formValues, setFormValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of fields) {
      if (defaultValues?.[field.name] !== undefined) {
        initial[field.name] = defaultValues[field.name];
      }
    }
    return initial;
  });

  const updateValue = useCallback((name: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  return (
    <>
      {fields.map((field) => {
        const visible = evaluateShowWhen(field.showWhen, formValues);
        if (!visible) return null;

        return (
          <div key={field.name} className="space-y-2">
            {field.type !== "address" && field.type !== "checkbox" && (
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>
            )}

            {field.type === "text" && (
              <Input
                id={field.name}
                name={field.name}
                placeholder={field.placeholder}
                defaultValue={(defaultValues?.[field.name] as string) ?? ""}
                required={field.required}
                onChange={(e) => updateValue(field.name, e.target.value)}
              />
            )}

            {field.type === "textarea" && (
              <Textarea
                id={field.name}
                name={field.name}
                placeholder={field.placeholder}
                defaultValue={(defaultValues?.[field.name] as string) ?? ""}
                required={field.required}
                rows={4}
                onChange={(e) => updateValue(field.name, e.target.value)}
              />
            )}

            {field.type === "select" && (
              <Select
                name={field.name}
                defaultValue={(defaultValues?.[field.name] as string) ?? ""}
                onValueChange={(val) => updateValue(field.name, val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={field.placeholder ?? "Select..."} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.type === "checkbox" && (
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id={field.name}
                  name={field.name}
                  defaultChecked={
                    (defaultValues?.[field.name] as boolean) ?? false
                  }
                  onChange={(e) =>
                    updateValue(field.name, e.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border"
                />
                <label htmlFor={field.name} className="text-sm font-normal">
                  {field.helpText ?? field.label}
                </label>
              </div>
            )}

            {field.type === "file" && (
              <Input
                id={field.name}
                name={field.name}
                type="file"
                required={field.required}
              />
            )}

            {field.type === "address" && (
              <AddressField
                name={field.name}
                label={field.label}
                required={field.required}
                helpText={field.helpText}
                onChange={(val) => updateValue(field.name, val)}
              />
            )}

            {field.helpText && field.type !== "checkbox" && field.type !== "address" && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        );
      })}
    </>
  );
}
