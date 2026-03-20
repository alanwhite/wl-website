"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadMedia, listMedia } from "@/lib/actions/media";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  altText: string | null;
}

interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, alt: string) => void;
}

export function MediaPickerDialog({ open, onClose, onSelect }: MediaPickerDialogProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadMedia();
    }
  }, [open]);

  async function loadMedia() {
    setLoading(true);
    try {
      const result = await listMedia(1, 48);
      setItems(result.items);
    } catch {
      toast.error("Failed to load media");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.set("file", file);
      await uploadMedia(formData);
      await loadMedia();
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input type="file" accept="image/*" onChange={handleUpload} />
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="aspect-square relative overflow-hidden rounded-md border hover:ring-2 hover:ring-primary"
                  onClick={() => {
                    onSelect(item.filePath, item.altText ?? item.fileName);
                    onClose();
                  }}
                >
                  <Image
                    src={item.filePath}
                    alt={item.altText ?? item.fileName}
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                </button>
              ))}
            </div>
          )}
          {items.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No images yet. Upload one above.</p>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
