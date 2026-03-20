"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { markContactRead, deleteContact } from "@/lib/actions/contact";
import { toast } from "sonner";

interface ContactActionsProps {
  contact: {
    id: string;
    name: string;
    email: string;
    subject: string | null;
    message: string;
    read: boolean;
  };
}

export function ContactActions({ contact }: ContactActionsProps) {
  const [open, setOpen] = useState(false);

  async function handleMarkRead() {
    try {
      await markContactRead(contact.id);
      toast.success("Marked as read");
    } catch {
      toast.error("Failed to update");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this contact submission?")) return;
    try {
      await deleteContact(contact.id);
      toast.success("Deleted");
      setOpen(false);
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (!contact.read) handleMarkRead();
          }}
        >
          View
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contact.subject ?? "Contact Message"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">From</p>
            <p className="text-sm text-muted-foreground">
              {contact.name} ({contact.email})
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Message</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {contact.message}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
