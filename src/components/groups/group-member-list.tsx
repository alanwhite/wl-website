"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addGroupMember, removeGroupMember } from "@/lib/actions/groups";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface GroupMemberListProps {
  groupId: string;
  members: { id: string; name: string; data: unknown }[];
  groupLabel: string;
}

export function GroupMemberList({ groupId, members, groupLabel }: GroupMemberListProps) {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAdd() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await addGroupMember(groupId, newName);
      setNewName("");
      toast.success("Member added");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      await removeGroupMember(id);
      toast.success("Member removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove");
    }
  }

  return (
    <div className="space-y-3">
      {members.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No additional members declared yet. Add members of your {groupLabel.toLowerCase()} who won&apos;t be signing in themselves.
        </p>
      )}
      {members.map((m) => (
        <div key={m.id} className="flex items-center justify-between rounded border px-3 py-2">
          <span className="text-sm">{m.name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => handleRemove(m.id, m.name)}
          >
            Remove
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={loading} size="sm">
          {loading ? "Adding..." : "Add"}
        </Button>
      </div>
    </div>
  );
}
