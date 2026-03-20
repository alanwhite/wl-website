"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { createPage, updatePage, deletePage } from "@/lib/actions/pages";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Image as ImageIcon } from "lucide-react";
import { MediaPickerDialog } from "@/components/admin/media-picker-dialog";

interface PageEditorProps {
  page?: {
    id: string;
    slug: string;
    title: string;
    content: string;
    published: boolean;
    sortOrder: number;
  };
}

export function PageEditor({ page }: PageEditorProps) {
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [title, setTitle] = useState(page?.title ?? "");
  const [content, setContent] = useState(page?.content ?? "");
  const [published, setPublished] = useState(page?.published ?? false);
  const [sortOrder, setSortOrder] = useState(page?.sortOrder ?? 0);
  const [loading, setLoading] = useState(false);
  const [mediaPicker, setMediaPicker] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setLoading(true);
    try {
      const data = { slug, title, content, published, sortOrder };
      if (page) {
        await updatePage(page.id, data);
        toast.success("Page updated");
      } else {
        await createPage(data);
        toast.success("Page created");
        router.push("/admin/pages");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!page || !confirm("Are you sure you want to delete this page?")) return;
    setLoading(true);
    try {
      await deletePage(page.id);
      toast.success("Page deleted");
    } catch {
      toast.error("Failed to delete");
      setLoading(false);
    }
  }

  function insertImage(url: string, alt: string) {
    const imageMarkdown = `\n![${alt}](${url})\n`;
    setContent((prev) => prev + imageMarkdown);
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!page) {
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")
                  );
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="content">Content</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMediaPicker(true)}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Insert Image
            </Button>
          </div>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            className="font-mono text-sm"
          />
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch id="published" checked={published} onCheckedChange={setPublished} />
            <Label htmlFor="published">Published</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              className="w-20"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={loading}>
            {page ? "Save Changes" : "Create Page"}
          </Button>
          {page && (
            <Button onClick={handleDelete} variant="destructive" disabled={loading}>
              Delete
            </Button>
          )}
          <Button variant="outline" asChild>
            <a href="/admin/pages">Cancel</a>
          </Button>
        </div>
      </CardContent>
      <MediaPickerDialog
        open={mediaPicker}
        onClose={() => setMediaPicker(false)}
        onSelect={insertImage}
      />
    </Card>
  );
}
