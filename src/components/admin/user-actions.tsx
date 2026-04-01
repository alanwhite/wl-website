"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { updateUserTier, assignUserRole, removeUserRole, updateUserStatus, deleteUser } from "@/lib/actions/admin";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import type { UserStatus } from "@prisma/client";

interface UserActionsProps {
  user: {
    id: string;
    tierId: string;
    tierLevel: number;
    status: UserStatus;
    userRoles: { roleId: string; role: { id: string; name: string } }[];
  };
  tiers: { id: string; name: string; level: number; isSystem: boolean }[];
  roles: { id: string; name: string; minTierLevel: number; requiredRoleId: string | null }[];
}

export function UserActions({ user, tiers, roles }: UserActionsProps) {
  const [loading, setLoading] = useState(false);

  const userRoleIds = new Set(user.userRoles.map((ur) => ur.roleId));

  // Eligible roles: user meets tier requirement, has prerequisite role, and doesn't already hold it
  const eligibleRoles = roles.filter((r) =>
    !userRoleIds.has(r.id) &&
    user.tierLevel >= r.minTierLevel &&
    (!r.requiredRoleId || userRoleIds.has(r.requiredRoleId))
  );

  // Non-system tiers for changing (exclude Pending and Admin system tiers from normal tier change)
  const changeTiers = tiers.filter((t) => t.id !== user.tierId);

  async function handleTier(tierId: string) {
    setLoading(true);
    try {
      await updateUserTier(user.id, tierId);
      toast.success("Tier updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update tier");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignRole(roleId: string) {
    setLoading(true);
    try {
      await assignUserRole(user.id, roleId);
      toast.success("Role assigned");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign role");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveRole(roleId: string) {
    setLoading(true);
    try {
      await removeUserRole(user.id, roleId);
      toast.success("Role removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove role");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatus(status: UserStatus) {
    setLoading(true);
    try {
      await updateUserStatus(user.id, status);
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={loading}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Change Tier */}
        {changeTiers.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Change Tier</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {changeTiers.map((tier) => (
                <DropdownMenuItem key={tier.id} onClick={() => handleTier(tier.id)}>
                  {tier.name} (level {tier.level})
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Assign Role */}
        {eligibleRoles.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Assign Role</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {eligibleRoles.map((role) => (
                <DropdownMenuItem key={role.id} onClick={() => handleAssignRole(role.id)}>
                  {role.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Remove Role */}
        {user.userRoles.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Remove Role</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {user.userRoles.map((ur) => (
                <DropdownMenuItem key={ur.roleId} onClick={() => handleRemoveRole(ur.roleId)} className="text-destructive">
                  {ur.role.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          Set Status
        </DropdownMenuItem>
        {user.status !== "APPROVED" && (
          <DropdownMenuItem onClick={() => handleStatus("APPROVED")}>
            Approve
          </DropdownMenuItem>
        )}
        {user.status !== "SUSPENDED" && (
          <DropdownMenuItem onClick={() => handleStatus("SUSPENDED")} className="text-destructive">
            Suspend
          </DropdownMenuItem>
        )}
        {user.status === "SUSPENDED" && (
          <DropdownMenuItem onClick={() => handleStatus("APPROVED")}>
            Unsuspend
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={async () => {
            if (!confirm("Permanently delete this user and all their data? This cannot be undone.")) return;
            setLoading(true);
            try {
              await deleteUser(user.id);
              toast.success("User deleted");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to delete user");
            } finally {
              setLoading(false);
            }
          }}
        >
          Delete User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
