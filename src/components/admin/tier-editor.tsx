"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTier, updateTier } from "@/lib/actions/tiers";
import { toast } from "sonner";

interface TierEditorProps {
  tier?: { id: string; name: string; slug: string; level: number; description: string | null; isSystem: boolean };
  onDone: () => void;
}

export function TierEditor({ tier, onDone }: TierEditorProps) {
  const [name, setName] = useState(tier?.name ?? "");
  const [slug, setSlug] = useState(tier?.slug ?? "");
  const [level, setLevel] = useState(tier?.level?.toString() ?? "");
  const [description, setDescription] = useState(tier?.description ?? "");
  const [saving, setSaving] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!tier) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }
  }

  async function handleSave() {
    if (!name.trim() || !slug.trim() || !level.trim()) {
      toast.error("Name, slug, and level are required");
      return;
    }
    const levelNum = parseInt(level, 10);
    if (isNaN(levelNum) || levelNum < 1 || levelNum > 998) {
      toast.error("Level must be between 1 and 998");
      return;
    }

    setSaving(true);
    try {
      const data = { name: name.trim(), slug: slug.trim(), level: levelNum, description: description.trim() || undefined };
      if (tier) {
        await updateTier(tier.id, data);
        toast.success("Tier updated");
      } else {
        await createTier(data);
        toast.success("Tier created");
      }
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save tier");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tier ? "Edit Tier" : "New Tier"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Full Member" />
          </div>
          <div className="space-y-1">
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="full-member" />
          </div>
          <div className="space-y-1">
            <Label>Level (1-998)</Label>
            <Input type="number" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="20" min={1} max={998} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Description (optional)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : tier ? "Update Tier" : "Create Tier"}
          </Button>
          <Button variant="outline" onClick={onDone}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
