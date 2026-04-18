"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  updateUserTier,
  updateUserStatus,
  assignUserRole,
  removeUserRole,
  deleteUser,
} from "@/lib/actions/members";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Tier {
  id: string;
  name: string;
  level: number;
}

interface Role {
  id: string;
  name: string;
  slug: string;
  minTierLevel: number;
}

interface MemberActionsProps {
  userId: string;
  currentTierId: string;
  currentStatus: string;
  currentRoleIds: string[];
  tiers: Tier[];
  roles: Role[];
  userName: string;
}

export function MemberActions({
  userId,
  currentTierId,
  currentStatus,
  currentRoleIds,
  tiers,
  roles,
  userName,
}: MemberActionsProps) {
  const [tierId, setTierId] = useState(currentTierId);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleTierChange() {
    if (tierId === currentTierId) return;
    setLoading(true);
    try {
      await updateUserTier(userId, tierId);
      toast.success("Tier updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update tier");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusToggle() {
    const newStatus = currentStatus === "APPROVED" ? "SUSPENDED" : "APPROVED";
    const action = newStatus === "SUSPENDED" ? "suspend" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} ${userName}?`)) return;

    setLoading(true);
    try {
      await updateUserStatus(userId, newStatus as any);
      toast.success(`User ${action}d`);
      router.refresh();
    } catch {
      toast.error(`Failed to ${action}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignRole(roleId: string) {
    setLoading(true);
    try {
      await assignUserRole(userId, roleId);
      toast.success("Role assigned");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign role");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveRole(roleId: string) {
    setLoading(true);
    try {
      await removeUserRole(userId, roleId);
      toast.success("Role removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove role");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to permanently delete ${userName}? This cannot be undone.`)) return;

    setLoading(true);
    try {
      await deleteUser(userId);
      toast.success("User deleted");
      router.push("/members");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  const assignableRoles = roles.filter((r) => !currentRoleIds.includes(r.id));
  const assignedRoles = roles.filter((r) => currentRoleIds.includes(r.id));

  return (
    <div className="space-y-4">
      {/* Tier */}
      <Card>
        <CardHeader>
          <CardTitle>Membership Tier</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label>Tier</Label>
            <Select value={tierId} onValueChange={setTierId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} (level {t.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleTierChange} disabled={loading || tierId === currentTierId}>
            Update
          </Button>
        </CardContent>
      </Card>

      {/* Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignedRoles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {assignedRoles.map((role) => (
                <Badge key={role.id} variant="secondary" className="gap-1 pr-1">
                  {role.name}
                  <button
                    onClick={() => handleRemoveRole(role.id)}
                    disabled={loading}
                    className="ml-1 rounded-full px-1 text-xs hover:bg-destructive hover:text-destructive-foreground"
                  >
                    &times;
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {assignableRoles.length > 0 && (
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label>Add role</Label>
                <Select onValueChange={handleAssignRole} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {assignedRoles.length === 0 && assignableRoles.length === 0 && (
            <p className="text-sm text-muted-foreground">No roles available</p>
          )}
        </CardContent>
      </Card>

      {/* Status & Delete */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          {currentStatus === "APPROVED" && (
            <Button variant="outline" onClick={handleStatusToggle} disabled={loading}>
              Suspend
            </Button>
          )}
          {currentStatus === "SUSPENDED" && (
            <Button variant="outline" onClick={handleStatusToggle} disabled={loading}>
              Reactivate
            </Button>
          )}
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            Delete User
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
