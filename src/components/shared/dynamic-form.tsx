"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RegistrationField } from "@/lib/config";

interface DynamicFormProps {
  fields: RegistrationField[];
  defaultValues?: Record<string, unknown>;
}

export function DynamicFormFields({ fields, defaultValues }: DynamicFormProps) {
  return (
    <>
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>

          {field.type === "text" && (
            <Input
              id={field.name}
              name={field.name}
              placeholder={field.placeholder}
              defaultValue={(defaultValues?.[field.name] as string) ?? ""}
              required={field.required}
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
            />
          )}

          {field.type === "select" && (
            <Select
              name={field.name}
              defaultValue={(defaultValues?.[field.name] as string) ?? ""}
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
            <div className="flex items-center gap-2">
              <Checkbox
                id={field.name}
                name={field.name}
                defaultChecked={
                  (defaultValues?.[field.name] as boolean) ?? false
                }
              />
              <Label htmlFor={field.name} className="font-normal">
                {field.helpText ?? field.label}
              </Label>
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

          {field.helpText && field.type !== "checkbox" && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      ))}
    </>
  );
}
