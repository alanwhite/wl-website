"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { moveDocument, moveCategory } from "@/lib/actions/library";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FolderOpen, ChevronRight, MoveRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: FolderNode[];
}

interface MoveDialogProps {
  itemId: string;
  itemName: string;
  itemType: "document" | "category";
  currentCategoryId: string;
  folders: FolderNode[];
}

function FolderTree({
  folders,
  selected,
  onSelect,
  excludeId,
  depth = 0,
}: {
  folders: FolderNode[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  excludeId?: string;
  depth?: number;
}) {
  return (
    <div className="space-y-1">
      {folders
        .filter((f) => f.id !== excludeId)
        .map((folder) => (
          <div key={folder.id}>
            <button
              type="button"
              onClick={() => onSelect(folder.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                selected === folder.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
              style={{ paddingLeft: `${depth * 20 + 8}px` }}
            >
              <FolderOpen className="h-4 w-4 shrink-0" />
              {folder.name}
            </button>
            {folder.children.length > 0 && (
              <FolderTree
                folders={folder.children}
                selected={selected}
                onSelect={onSelect}
                excludeId={excludeId}
                depth={depth + 1}
              />
            )}
          </div>
        ))}
    </div>
  );
}

export function MoveDialog({ itemId, itemName, itemType, currentCategoryId, folders }: MoveDialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleMove() {
    if (selected === currentCategoryId) {
      toast.error("Already in this folder");
      return;
    }
    setLoading(true);
    try {
      if (itemType === "document") {
        if (!selected) {
          toast.error("Please select a destination folder");
          return;
        }
        await moveDocument(itemId, selected);
      } else {
        await moveCategory(itemId, selected);
      }
      toast.success(`Moved "${itemName}"`);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to move");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoveRight className="mr-1 h-3.5 w-3.5" />
          Move
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move &quot;{itemName}&quot;</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto rounded-md border p-2">
          {/* Top level (root) option — only for categories */}
          {itemType === "category" && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                selected === null
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              <Home className="h-4 w-4 shrink-0" />
              Top Level (Documents root)
            </button>
          )}
          <FolderTree
            folders={folders}
            selected={selected}
            onSelect={setSelected}
            excludeId={itemType === "category" ? itemId : undefined}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={loading || (itemType === "document" && selected === null)}
            onClick={handleMove}
          >
            {loading ? "Moving..." : "Move here"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
