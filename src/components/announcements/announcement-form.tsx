"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/actions/member-announcements";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, X } from "lucide-react";
import Image from "next/image";
import { MediaPickerDialog } from "@/components/admin/media-picker-dialog";
import { ProjectSelect } from "@/components/shared/project-select";

interface MemberAnnouncementFormProps {
  announcement?: {
    id: string;
    title: string;
    content: string;
    imageUrls: string[];
    published: boolean;
    pinned: boolean;
    expiresAt: Date | null;
    projectId?: string | null;
  };
  projects?: { id: string; name: string }[];
  defaultProjectId?: string;
}

export function MemberAnnouncementForm({ announcement, projects = [], defaultProjectId }: MemberAnnouncementFormProps) {
  const isEdit = !!announcement;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");
  const [imageUrls, setImageUrls] = useState<string[]>(announcement?.imageUrls ?? []);
  const [published, setPublished] = useState(announcement?.published ?? true);
  const [pinned, setPinned] = useState(announcement?.pinned ?? false);
  const [expiresAt, setExpiresAt] = useState(
    announcement?.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0, 10) : "",
  );
  const [projectId, setProjectId] = useState(announcement?.projectId ?? defaultProjectId ?? "");
  const [mediaPicker, setMediaPicker] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const data = {
        title,
        content,
        imageUrls,
        published,
        pinned,
        expiresAt: expiresAt || null,
        // Only send projectId when the user can pick one; otherwise leave unchanged
        ...(projects.length > 0 ? { projectId: projectId || null } : {}),
      };
      if (isEdit) {
        await updateAnnouncement(announcement.id, data);
        toast.success("Announcement updated");
      } else {
        await createAnnouncement(data);
        toast.success("Announcement created");
      }
      router.push("/announcements");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!announcement || !confirm("Delete this announcement? This cannot be undone.")) return;
    setLoading(true);
    try {
      await deleteAnnouncement(announcement.id);
      toast.success("Announcement deleted");
      router.push("/announcements");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Announcement" : "New Announcement"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Content</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
        </div>
        <div className="space-y-2">
          <Label>Images (optional)</Label>
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {imageUrls.map((url, i) => (
                <div key={`${url}-${i}`} className="relative aspect-square">
                  <Image
                    src={url}
                    alt={`Image ${i + 1}`}
                    fill
                    sizes="120px"
                    className="rounded-md border object-cover"
                    unoptimized
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-6 w-6 bg-background/80 p-0 hover:bg-background"
                    onClick={() => setImageUrls((arr) => arr.filter((_, idx) => idx !== i))}
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setMediaPicker(true)}>
            <ImageIcon className="mr-2 h-4 w-4" /> {imageUrls.length === 0 ? "Pick image" : "Add another image"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={published} onCheckedChange={setPublished} />
            <Label>Published</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={pinned} onCheckedChange={setPinned} />
            <Label>Pinned</Label>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Expires (optional)</Label>
          <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="max-w-xs" />
        </div>
        <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} />
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
      <MediaPickerDialog
        open={mediaPicker}
        onClose={() => setMediaPicker(false)}
        onSelect={(url) => setImageUrls((arr) => [...arr, url])}
      />
    </Card>
  );
}
