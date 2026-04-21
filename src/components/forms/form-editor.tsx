"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createForm, updateForm, deleteForm } from "@/lib/actions/forms";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface FormEditorProps {
  roles: { id: string; name: string; slug: string }[];
  form?: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    fields: unknown;
    published: boolean;
    managerRoleSlugs: string[];
  };
}

export function FormEditor({ roles, form }: FormEditorProps) {
  const isEdit = !!form;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(form?.title ?? "");
  const [slug, setSlug] = useState(form?.slug ?? "");
  const [description, setDescription] = useState(form?.description ?? "");
  const [fieldsJson, setFieldsJson] = useState(
    form ? JSON.stringify(form.fields, null, 2) : "[]",
  );
  const [published, setPublished] = useState(form?.published ?? false);
  const [managerSlugs, setManagerSlugs] = useState<string[]>(form?.managerRoleSlugs ?? []);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!isEdit) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      JSON.parse(fieldsJson);
      if (isEdit) {
        await updateForm(form.id, {
          title,
          slug,
          description,
          fields: fieldsJson,
          published,
          managerRoleSlugs: managerSlugs,
        });
        toast.success("Form updated");
      } else {
        await createForm({
          title,
          slug,
          description,
          fields: fieldsJson,
          managerRoleSlugs: managerSlugs,
        });
        toast.success("Form created");
      }
      router.push("/forms");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid JSON in fields");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!form || !confirm(`Delete "${form.title}"? All submissions will be lost.`)) return;
    setLoading(true);
    try {
      await deleteForm(form.id);
      toast.success("Form deleted");
      router.push("/forms");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Form" : "Create Form"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>URL Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          <p className="text-xs text-muted-foreground">Public URL: /forms/{slug || "..."}</p>
        </div>
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="space-y-2">
          <Label>Fields (JSON)</Label>
          <p className="text-xs text-muted-foreground">
            Same format as registration fields: name, label, type (text/textarea/select/checkbox), required, options, helpText, showWhen.
          </p>
          <Textarea
            value={fieldsJson}
            onChange={(e) => setFieldsJson(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
        </div>
        {isEdit && (
          <div className="flex items-center gap-2">
            <Switch checked={published} onCheckedChange={setPublished} />
            <Label>Published</Label>
          </div>
        )}
        <div className="space-y-2">
          <Label>Manager Roles</Label>
          <p className="text-xs text-muted-foreground">Who can review submissions for this form.</p>
          {roles.map((role) => (
            <div key={role.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`form-role-${role.slug}`}
                checked={managerSlugs.includes(role.slug)}
                onChange={(e) => {
                  if (e.target.checked) setManagerSlugs([...managerSlugs, role.slug]);
                  else setManagerSlugs(managerSlugs.filter((s) => s !== role.slug));
                }}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor={`form-role-${role.slug}`} className="font-normal">{role.name}</Label>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
          {isEdit && (
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
