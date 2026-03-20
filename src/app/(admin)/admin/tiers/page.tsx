"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTiers, deleteTier } from "@/lib/actions/tiers";
import { TierEditor } from "@/components/admin/tier-editor";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Tier = { id: string; name: string; slug: string; level: number; description: string | null; isSystem: boolean };

export default function TiersPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [editing, setEditing] = useState<Tier | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const data = await getTiers();
    setTiers(data);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(tier: Tier) {
    if (!confirm(`Delete tier "${tier.name}"?`)) return;
    try {
      await deleteTier(tier.id);
      toast.success("Tier deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Membership Tiers</h1>
        <TierEditor tier={editing} onDone={() => { setEditing(null); load(); }} />
      </div>
    );
  }

  if (creating) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Membership Tiers</h1>
        <TierEditor onDone={() => { setCreating(false); load(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Membership Tiers</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tier
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Level</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier) => (
              <TableRow key={tier.id}>
                <TableCell className="font-mono">{tier.level}</TableCell>
                <TableCell className="font-medium">{tier.name}</TableCell>
                <TableCell className="text-muted-foreground">{tier.slug}</TableCell>
                <TableCell className="text-muted-foreground">{tier.description ?? "—"}</TableCell>
                <TableCell>
                  {tier.isSystem ? (
                    <Badge variant="outline">System</Badge>
                  ) : (
                    <Badge variant="secondary">Custom</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {!tier.isSystem && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(tier)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(tier)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
