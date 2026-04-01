"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/library";
import { toast } from "sonner";

interface CategoryFormProps {
  category?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    sortOrder: number;
    targetRoleSlugs: string[];
    targetMinTierLevel: number | null;
    uploaderRoleSlugs: string[];
    uploaderMinTierLevel: number | null;
  };
  roles: { id: string; name: string; slug: string }[];
  tiers: { id: string; name: string; level: number }[];
}

export function CategoryForm({ category, roles, tiers }: CategoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0);
  const [targetRoleSlugs, setTargetRoleSlugs] = useState<string[]>(category?.targetRoleSlugs ?? []);
  const [targetMinTierLevel, setTargetMinTierLevel] = useState<string>(
    category?.targetMinTierLevel?.toString() ?? ""
  );
  const [uploaderRoleSlugs, setUploaderRoleSlugs] = useState<string[]>(category?.uploaderRoleSlugs ?? []);
  const [uploaderMinTierLevel, setUploaderMinTierLevel] = useState<string>(
    category?.uploaderMinTierLevel?.toString() ?? ""
  );

  function handleNameChange(value: string) {
    setName(value);
    if (!category) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    // Append role slugs
    for (const s of targetRoleSlugs) {
      formData.append("targetRoleSlugs", s);
    }
    for (const s of uploaderRoleSlugs) {
      formData.append("uploaderRoleSlugs", s);
    }
    try {
      if (category) {
        await updateCategory(category.id, formData);
        toast.success("Category updated");
      } else {
        await createCategory(formData);
        toast.success("Category created");
      }
      router.push("/admin/documents");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!category) return;
    if (!confirm(`Delete category "${category.name}" and all its documents? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await deleteCategory(category.id);
      toast.success("Category deleted");
      router.push("/admin/documents");
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
                placeholder="Committee Minutes"
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
                placeholder="committee-minutes"
                disabled={!!category}
              />
              {!category && (
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
              rows={2}
              placeholder="Minutes from monthly committee meetings"
            />
          </div>

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

          <div className="space-y-3 rounded border p-4">
            <Label className="text-base">Who can view</Label>
            <p className="text-sm text-muted-foreground">
              Leave empty to make this category visible to all approved members.
            </p>

            {roles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Require one of these roles:</Label>
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`cat-role-${role.slug}`}
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
                    <Label htmlFor={`cat-role-${role.slug}`} className="text-sm font-normal">
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
            <Label className="text-base">Who can upload</Label>
            <p className="text-sm text-muted-foreground">
              Leave empty so only admins can upload. Select roles/tiers to allow others to upload documents.
            </p>

            {roles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Allow upload for these roles:</Label>
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`upload-role-${role.slug}`}
                      checked={uploaderRoleSlugs.includes(role.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUploaderRoleSlugs([...uploaderRoleSlugs, role.slug]);
                        } else {
                          setUploaderRoleSlugs(uploaderRoleSlugs.filter((s) => s !== role.slug));
                        }
                      }}
                      className="h-4 w-4 rounded border"
                    />
                    <Label htmlFor={`upload-role-${role.slug}`} className="text-sm font-normal">
                      {role.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {tiers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="uploaderMinTierLevel" className="text-sm">Minimum tier level to upload:</Label>
                <select
                  id="uploaderMinTierLevel"
                  name="uploaderMinTierLevel"
                  value={uploaderMinTierLevel}
                  onChange={(e) => setUploaderMinTierLevel(e.target.value)}
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Admin only</option>
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.level}>
                      {tier.name} (level {tier.level})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : category ? "Save Changes" : "Create Category"}
            </Button>
            {category && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                Delete Category
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
