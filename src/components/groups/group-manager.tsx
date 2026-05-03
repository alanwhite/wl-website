"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGroup, deleteGroup, assignUserToGroup, removeUserFromGroup } from "@/lib/actions/groups";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UserInfo {
  id: string;
  name: string | null;
  email: string | null;
}

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  members: UserInfo[];
  groupMembers: { id: string; name: string; userId: string | null }[];
}

interface GroupManagerProps {
  groups: GroupData[];
  groupLabel: string;
  allUsers: UserInfo[];
}

export function GroupManager({ groups, groupLabel, allUsers }: GroupManagerProps) {
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

  async function handleAssignUser(groupId: string, userId: string) {
    try {
      await assignUserToGroup(userId, groupId);
      toast.success("User added");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add user");
    }
  }

  async function handleRemoveUser(groupId: string, userId: string, userName: string) {
    if (!confirm(`Remove ${userName} from this ${groupLabel.toLowerCase()}?`)) return;
    try {
      await removeUserFromGroup(userId, groupId);
      toast.success("User removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove user");
    }
  }

  // Get IDs of all users already in any group
  const assignedUserIds = new Set(groups.flatMap((g) => g.members.map((m) => m.id)));

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
                placeholder="e.g. The Smith Family"
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
            const totalMembers = group.groupMembers.length || group.members.length;
            // Users not in this group (available to assign)
            const availableUsers = allUsers.filter(
              (u) => !group.members.some((m) => m.id === u.id),
            );

            return (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      {group.description && (
                        <CardDescription>{group.description}</CardDescription>
                      )}
                    </div>
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
                <CardContent className="space-y-3 pt-0">
                  {/* All members (unified view) */}
                  {group.groupMembers.length > 0 && (
                    <div className="space-y-1">
                      {group.groupMembers.map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded border px-3 py-1.5">
                          <span className="text-sm">
                            {m.name}
                            {m.userId && <span className="ml-1 text-xs text-muted-foreground">(registered)</span>}
                          </span>
                          {m.userId ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleRemoveUser(group.id, m.userId!, m.name)}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Assign user */}
                  {availableUsers.length > 0 && (
                    <div className="pt-1">
                      <Select onValueChange={(userId) => handleAssignUser(group.id, userId)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Add a user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name || u.email}
                              {assignedUserIds.has(u.id) && (
                                <span className="ml-2 text-xs text-muted-foreground">(in another {groupLabel.toLowerCase()})</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
