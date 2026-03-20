"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { uploadMedia, deleteMedia } from "@/lib/actions/media";
import { toast } from "sonner";
import { Upload, Trash2, Copy } from "lucide-react";
import { format } from "date-fns";

interface MediaItem {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  altText: string | null;
  createdAt: Date;
}

interface MediaGalleryProps {
  items: MediaItem[];
  currentPage: number;
  totalPages: number;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaGallery({ items, currentPage, totalPages }: MediaGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.set("file", file);
        await uploadMedia(formData);
      }
      toast.success("Upload complete");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this file?")) return;
    try {
      await deleteMedia(id);
      toast.success("Deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    }
  }

  function copyUrl(path: string) {
    navigator.clipboard.writeText(path);
    toast.success("URL copied to clipboard");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="max-w-xs"
          disabled={uploading}
        />
        <Button
          variant="outline"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">No media files yet. Upload your first image above.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => (
            <Card key={item.id} className="group relative overflow-hidden">
              <div className="aspect-square relative">
                {item.fileType.startsWith("image/") ? (
                  <Image
                    src={item.filePath}
                    alt={item.altText ?? item.fileName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
                    {item.fileName}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="icon" variant="secondary" onClick={() => copyUrl(item.filePath)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-medium">{item.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(item.fileSize)} &middot; {format(new Date(item.createdAt), "MMM d")}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => router.push(`/admin/media?page=${currentPage - 1}`)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => router.push(`/admin/media?page=${currentPage + 1}`)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
