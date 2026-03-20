"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createRole, updateRole } from "@/lib/actions/roles";
import { toast } from "sonner";

interface RoleData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  minTierLevel: number;
  requiredRoleId: string | null;
}

interface RoleEditorProps {
  role?: RoleData;
  tiers: { id: string; name: string; level: number; isSystem: boolean }[];
  roles: { id: string; name: string }[];
  onDone: () => void;
}

export function RoleEditor({ role, tiers, roles, onDone }: RoleEditorProps) {
  const [name, setName] = useState(role?.name ?? "");
  const [slug, setSlug] = useState(role?.slug ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [minTierLevel, setMinTierLevel] = useState(role?.minTierLevel?.toString() ?? "0");
  const [requiredRoleId, setRequiredRoleId] = useState(role?.requiredRoleId ?? "");
  const [saving, setSaving] = useState(false);

  // Filter out system tiers (Pending/Admin) for the min-tier dropdown, but include "No minimum" (0)
  const selectableTiers = tiers.filter((t) => !t.isSystem);
  const otherRoles = roles.filter((r) => r.id !== role?.id);

  function handleNameChange(value: string) {
    setName(value);
    if (!role) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }
  }

  async function handleSave() {
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        minTierLevel: parseInt(minTierLevel, 10) || 0,
        requiredRoleId: requiredRoleId || null,
      };
      if (role) {
        await updateRole(role.id, data);
        toast.success("Role updated");
      } else {
        await createRole(data);
        toast.success("Role created");
      }
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save role");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{role ? "Edit Role" : "New Role"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Committee Member" />
          </div>
          <div className="space-y-1">
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="committee-member" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Description (optional)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Minimum Tier</Label>
            <Select value={minTierLevel} onValueChange={setMinTierLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No minimum</SelectItem>
                {selectableTiers.map((t) => (
                  <SelectItem key={t.id} value={t.level.toString()}>{t.name} (level {t.level})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Prerequisite Role</Label>
            <Select value={requiredRoleId || "none"} onValueChange={(v) => setRequiredRoleId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {otherRoles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : role ? "Update Role" : "Create Role"}
          </Button>
          <Button variant="outline" onClick={onDone}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
