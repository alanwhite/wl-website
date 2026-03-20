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
import { getRoles, deleteRole } from "@/lib/actions/roles";
import { getTiers } from "@/lib/actions/tiers";
import { RoleEditor } from "@/components/admin/role-editor";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type RoleWithReq = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  minTierLevel: number;
  requiredRoleId: string | null;
  requiredRole: { id: string; name: string } | null;
};
type Tier = { id: string; name: string; slug: string; level: number; description: string | null; isSystem: boolean };

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleWithReq[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [editing, setEditing] = useState<RoleWithReq | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const [r, t] = await Promise.all([getRoles(), getTiers()]);
    setRoles(r);
    setTiers(t);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(role: RoleWithReq) {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await deleteRole(role.id);
      toast.success("Role deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const simpleRoles = roles.map((r) => ({ id: r.id, name: r.name }));

  if (editing) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Roles</h1>
        <RoleEditor role={editing} tiers={tiers} roles={simpleRoles} onDone={() => { setEditing(null); load(); }} />
      </div>
    );
  }

  if (creating) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Roles</h1>
        <RoleEditor tiers={tiers} roles={simpleRoles} onDone={() => { setCreating(false); load(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Roles</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Role
        </Button>
      </div>
      {roles.length === 0 ? (
        <p className="text-muted-foreground">No roles configured yet. Add one to get started.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Min Tier Level</TableHead>
                <TableHead>Requires Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground">{role.slug}</TableCell>
                  <TableCell>
                    {role.minTierLevel > 0 ? (
                      <Badge variant="secondary">{role.minTierLevel}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {role.requiredRole ? (
                      <Badge variant="outline">{role.requiredRole.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{role.description ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(role)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(role)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
