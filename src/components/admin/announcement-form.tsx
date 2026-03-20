"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/actions/announcements";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";

interface AnnouncementFormProps {
  announcement?: {
    id: string;
    title: string;
    content: string;
    published: boolean;
    pinned: boolean;
    expiresAt: string | null;
  };
}

export function AnnouncementForm({ announcement }: AnnouncementFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");
  const [published, setPublished] = useState(announcement?.published ?? false);
  const [pinned, setPinned] = useState(announcement?.pinned ?? false);
  const [expiresAt, setExpiresAt] = useState(
    announcement?.expiresAt ? announcement.expiresAt.split("T")[0] : ""
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setLoading(true);
    try {
      const data = {
        title,
        content,
        published,
        pinned,
        expiresAt: expiresAt || null,
      };

      if (announcement) {
        await updateAnnouncement(announcement.id, data);
        toast.success("Announcement updated");
      } else {
        await createAnnouncement(data);
        toast.success("Announcement created");
        setTitle("");
        setContent("");
        setPublished(false);
        setPinned(false);
        setExpiresAt("");
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!announcement || !confirm("Delete this announcement?")) return;
    setLoading(true);
    try {
      await deleteAnnouncement(announcement.id);
      toast.success("Deleted");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {announcement ? (
          <Button variant="ghost" size="sm">
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Announcement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {announcement ? "Edit Announcement" : "New Announcement"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <Label>Expires At (optional)</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : announcement ? "Update" : "Create"}
            </Button>
            {announcement && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
