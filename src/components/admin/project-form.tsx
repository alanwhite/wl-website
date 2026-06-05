"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createProject, updateProject, deleteProject, setProjectStatus } from "@/lib/actions/projects";
import { toast } from "sonner";

interface ProjectFormProps {
  project?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: "ACTIVE" | "ARCHIVED";
    sortOrder: number;
    pinToNav: boolean;
    targetRoleSlugs: string[];
    targetMinTierLevel: number | null;
    contributorRoleSlugs: string[];
    contributorMinTierLevel: number | null;
  };
  roles: { id: string; name: string; slug: string }[];
  tiers: { id: string; name: string; level: number }[];
  label: string;
}

export function ProjectForm({ project, roles, tiers, label }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(project?.name ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [sortOrder, setSortOrder] = useState(project?.sortOrder ?? 0);
  const [pinToNav, setPinToNav] = useState(project?.pinToNav ?? false);
  const [targetRoleSlugs, setTargetRoleSlugs] = useState<string[]>(project?.targetRoleSlugs ?? []);
  const [targetMinTierLevel, setTargetMinTierLevel] = useState<string>(
    project?.targetMinTierLevel?.toString() ?? ""
  );
  const [contributorRoleSlugs, setContributorRoleSlugs] = useState<string[]>(project?.contributorRoleSlugs ?? []);
  const [contributorMinTierLevel, setContributorMinTierLevel] = useState<string>(
    project?.contributorMinTierLevel?.toString() ?? ""
  );

  function handleNameChange(value: string) {
    setName(value);
    if (!project) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    for (const s of targetRoleSlugs) {
      formData.append("targetRoleSlugs", s);
    }
    for (const s of contributorRoleSlugs) {
      formData.append("contributorRoleSlugs", s);
    }
    try {
      if (project) {
        await updateProject(project.id, formData);
        toast.success(`${label} updated`);
      } else {
        await createProject(formData);
        toast.success(`${label} created`);
      }
      router.push("/admin/projects");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleArchiveToggle() {
    if (!project) return;
    setLoading(true);
    try {
      await setProjectStatus(project.id, project.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE");
      toast.success(project.status === "ACTIVE" ? `${label} archived` : `${label} reactivated`);
      router.push("/admin/projects");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!project) return;
    if (!confirm(`Delete "${project.name}"? Linked polls, folders, events, announcements and forms revert to standalone — nothing else is deleted.`)) return;
    setLoading(true);
    try {
      await deleteProject(project.id);
      toast.success(`${label} deleted`);
      router.push("/admin/projects");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                placeholder="Gala Day 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                placeholder="gala-day-2026"
                disabled={!!project}
              />
              {!project && (
                <p className="text-xs text-muted-foreground">Auto-generated from name. Used in the URL.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Planning and coordination for the 2026 summer gala day"
            />
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-24"
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                id="pinToNav"
                name="pinToNav"
                checked={pinToNav}
                onChange={(e) => setPinToNav(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="pinToNav" className="font-normal">
                Pin to member navigation
              </Label>
            </div>
          </div>

          <div className="space-y-3 rounded border p-4">
            <Label className="text-base">Who can view</Label>
            <p className="text-sm text-muted-foreground">
              Leave empty to make this {label.toLowerCase()} visible to all approved members.
              Content inside is additionally filtered by its own targeting.
            </p>

            {roles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Require one of these roles:</Label>
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`view-role-${role.slug}`}
                      checked={targetRoleSlugs.includes(role.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTargetRoleSlugs([...targetRoleSlugs, role.slug]);
                        } else {
                          setTargetRoleSlugs(targetRoleSlugs.filter((s) => s !== role.slug));
                        }
                      }}
                      className="h-4 w-4 rounded border"
                    />
                    <Label htmlFor={`view-role-${role.slug}`} className="text-sm font-normal">
                      {role.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {tiers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="targetMinTierLevel" className="text-sm">Minimum tier level:</Label>
                <select
                  id="targetMinTierLevel"
                  name="targetMinTierLevel"
                  value={targetMinTierLevel}
                  onChange={(e) => setTargetMinTierLevel(e.target.value)}
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Any tier</option>
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.level}>
                      {tier.name} (level {tier.level})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded border p-4">
            <Label className="text-base">Who can contribute</Label>
            <p className="text-sm text-muted-foreground">
              Contributors can add polls, document folders, events, announcements and forms to
              this {label.toLowerCase()}. Leave empty so only admins and project managers can.
            </p>

            {roles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Allow contributions from these roles:</Label>
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`contrib-role-${role.slug}`}
                      checked={contributorRoleSlugs.includes(role.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setContributorRoleSlugs([...contributorRoleSlugs, role.slug]);
                        } else {
                          setContributorRoleSlugs(contributorRoleSlugs.filter((s) => s !== role.slug));
                        }
                      }}
                      className="h-4 w-4 rounded border"
                    />
                    <Label htmlFor={`contrib-role-${role.slug}`} className="text-sm font-normal">
                      {role.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {tiers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="contributorMinTierLevel" className="text-sm">Minimum tier level to contribute:</Label>
                <select
                  id="contributorMinTierLevel"
                  name="contributorMinTierLevel"
                  value={contributorMinTierLevel}
                  onChange={(e) => setContributorMinTierLevel(e.target.value)}
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Admins &amp; project managers only</option>
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.level}>
                      {tier.name} (level {tier.level})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : project ? "Save Changes" : `Create ${label}`}
            </Button>
            {project && (
              <>
                <Button type="button" variant="outline" onClick={handleArchiveToggle} disabled={loading}>
                  {project.status === "ACTIVE" ? "Archive" : "Reactivate"}
                </Button>
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                  Delete
                </Button>
              </>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
