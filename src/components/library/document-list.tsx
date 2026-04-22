"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteDocument } from "@/lib/actions/library";
import { MoveDialog } from "./move-dialog";
import { toast } from "sonner";
import type { FolderNode } from "@/lib/folder-tree";

interface DocumentItem {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  createdAt: Date;
  uploader: { name: string | null } | null;
}

interface DocumentListProps {
  documents: DocumentItem[];
  canManage: boolean;
  canMove?: boolean;
  categoryId?: string;
  folders?: FolderNode[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    "application/pdf": "PDF",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.ms-excel": "XLS",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "application/vnd.ms-powerpoint": "PPT",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
    "text/plain": "TXT",
  };
  return labels[type] ?? type.split("/").pop()?.toUpperCase() ?? "FILE";
}

export function DocumentList({ documents: initialDocs, canManage, canMove, categoryId, folders }: DocumentListProps) {
  const [documents, setDocuments] = useState(initialDocs);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteDocument(id);
      setDocuments(documents.filter((d) => d.id !== id));
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeleting(null);
    }
  }

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents in this category yet.</p>;
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 rounded border p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-xs font-bold">
            {fileTypeLabel(doc.fileType)}
          </div>
          <div className="flex-1 min-w-0">
            <a
              href={`/uploads/library/${doc.filePath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline"
            >
              {doc.title}
            </a>
            {doc.description && (
              <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formatFileSize(doc.fileSize)} &middot; {doc.uploader?.name ?? "Unknown"} &middot;{" "}
              {new Date(doc.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/uploads/library/${doc.filePath}`} download={doc.fileName}>
                Download
              </a>
            </Button>
            {canMove && folders && categoryId && (
              <MoveDialog
                itemId={doc.id}
                itemName={doc.title}
                itemType="document"
                currentCategoryId={categoryId}
                folders={folders}
              />
            )}
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(doc.id)}
                disabled={deleting === doc.id}
              >
                {deleting === doc.id ? "..." : "Delete"}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
