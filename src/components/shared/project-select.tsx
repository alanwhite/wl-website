"use client";

import { Label } from "@/components/ui/label";

interface ProjectSelectProps {
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
  value?: string;
  onChange?: (projectId: string) => void;
  label?: string;
}

/**
 * Optional project link for artifact create/edit forms. Renders nothing when
 * the user has no projects they can contribute to. Submits as `projectId`.
 */
export function ProjectSelect({ projects, defaultProjectId, value, onChange, label = "Project" }: ProjectSelectProps) {
  if (projects.length === 0) return null;

  const controlled = onChange !== undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor="projectId">{label} (optional)</Label>
      <select
        id="projectId"
        name="projectId"
        {...(controlled
          ? { value: value ?? "", onChange: (e) => onChange(e.target.value) }
          : { defaultValue: defaultProjectId ?? "" })}
        className="w-full rounded border bg-background px-3 py-2 text-sm"
      >
        <option value="">None</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        Linked items appear on the {label.toLowerCase()} page and are only visible to its members.
      </p>
    </div>
  );
}
