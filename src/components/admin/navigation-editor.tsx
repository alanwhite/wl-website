"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { updateNavigation, type NavLink } from "@/lib/actions/settings";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { availableIcons, getIcon } from "@/lib/icons";

interface NavigationEditorProps {
  initialLinks: NavLink[];
  tiers: { id: string; name: string; level: number }[];
  roles: { id: string; name: string; slug: string }[];
}

export function NavigationEditor({ initialLinks, tiers, roles }: NavigationEditorProps) {
  const [links, setLinks] = useState<NavLink[]>(initialLinks);
  const [saving, setSaving] = useState(false);

  function addLink() {
    setLinks([
      ...links,
      {
        label: "",
        href: "/",
        isExternal: false,
        sortOrder: links.length,
        minTierLevel: null,
        requiredRoleSlug: null,
      },
    ]);
  }

  function removeLink(index: number) {
    setLinks(links.filter((_, i) => i !== index));
  }

  function updateLink(index: number, updates: Partial<NavLink>) {
    setLinks(links.map((link, i) => (i === index ? { ...link, ...updates } : link)));
  }

  function moveLink(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= links.length) return;
    const newLinks = [...links];
    [newLinks[index], newLinks[newIndex]] = [newLinks[newIndex], newLinks[index]];
    setLinks(newLinks.map((link, i) => ({ ...link, sortOrder: i })));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const ordered = links.map((link, i) => ({ ...link, sortOrder: i }));
      await updateNavigation(ordered);
      toast.success("Navigation saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {links.map((link, index) => (
        <Card key={index}>
          <CardContent className="flex items-start gap-4 pt-4">
            <div className="flex flex-col gap-1 pt-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => moveLink(index, -1)}
                disabled={index === 0}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => moveLink(index, 1)}
                disabled={index === links.length - 1}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid flex-1 gap-3 sm:grid-cols-6">
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={link.label}
                  onChange={(e) => updateLink(index, { label: e.target.value })}
                  placeholder="About"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">URL</Label>
                <Input
                  value={link.href}
                  onChange={(e) => updateLink(index, { href: e.target.value })}
                  placeholder="/about"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Icon</Label>
                <Select
                  value={link.icon ?? "none"}
                  onValueChange={(v) => updateLink(index, { icon: v === "none" ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableIcons.map((name) => {
                      const Icon = getIcon(name);
                      return (
                        <SelectItem key={name} value={name}>
                          <span className="flex items-center gap-2">
                            {Icon && <Icon className="h-3.5 w-3.5" />}
                            {name}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Min Tier</Label>
                <Select
                  value={link.minTierLevel === null ? "public" : link.minTierLevel.toString()}
                  onValueChange={(v) => updateLink(index, { minTierLevel: v === "public" ? null : parseInt(v, 10) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    {tiers.map((t) => (
                      <SelectItem key={t.id} value={t.level.toString()}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Required Role</Label>
                <Select
                  value={link.requiredRoleSlug ?? "none"}
                  onValueChange={(v) => updateLink(index, { requiredRoleSlug: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.slug}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={link.isExternal}
                    onCheckedChange={(v) => updateLink(index, { isExternal: v })}
                  />
                  <Label className="text-xs">External</Label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeLink(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" onClick={addLink}>
          <Plus className="mr-2 h-4 w-4" />
          Add Link
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Navigation"}
        </Button>
      </div>
    </div>
  );
}
