"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createGroup, deleteGroup } from "@/lib/actions/groups";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  members: { id: string; name: string | null; email: string | null }[];
  groupMembers: { id: string; name: string }[];
}

interface GroupManagerProps {
  groups: GroupData[];
  groupLabel: string;
}

export function GroupManager({ groups, groupLabel }: GroupManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await createGroup({ name: newName, description: newDesc || undefined });
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      toast.success(`${groupLabel} created`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will remove all associated members.`)) return;
    try {
      await deleteGroup(id);
      toast.success(`${groupLabel} deleted`);
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="space-y-4">
      {!showCreate ? (
        <Button onClick={() => setShowCreate(true)}>
          Create {groupLabel}
        </Button>
      ) : (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`e.g. The Smith Family`}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={loading} size="sm">
                {loading ? "Creating..." : "Create"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {groupLabel.toLowerCase()}s created yet.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const totalMembers = group.members.length + group.groupMembers.length;
            return (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {totalMembers} {totalMembers === 1 ? "member" : "members"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(group.id, group.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {(group.members.length > 0 || group.groupMembers.length > 0) && (
                  <CardContent className="pt-0">
                    <div className="text-sm text-muted-foreground">
                      {group.members.length > 0 && (
                        <div>
                          <span className="font-medium">Users:</span>{" "}
                          {group.members.map((m) => m.name || m.email).join(", ")}
                        </div>
                      )}
                      {group.groupMembers.length > 0 && (
                        <div>
                          <span className="font-medium">Additional:</span>{" "}
                          {group.groupMembers.map((m) => m.name).join(", ")}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
