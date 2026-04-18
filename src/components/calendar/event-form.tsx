"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createEvent, updateEvent } from "@/lib/actions/calendar";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EventFormProps {
  event?: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    startDate: Date;
    endDate: Date;
    allDay: boolean;
    recurrence: string | null;
    recurrenceEnd: Date | null;
  };
}

function toLocalDateTimeString(date: Date): string {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toLocalDateString(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function EventForm({ event }: EventFormProps) {
  const isEdit = !!event;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [recurrence, setRecurrence] = useState(event?.recurrence ?? "none");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      title: form.get("title") as string,
      description: (form.get("description") as string) || undefined,
      location: (form.get("location") as string) || undefined,
      startDate: (form.get("startDate") as string),
      endDate: (form.get("endDate") as string) || (form.get("startDate") as string),
      allDay,
      recurrence: recurrence === "none" ? undefined : recurrence,
      recurrenceEnd: (form.get("recurrenceEnd") as string) || undefined,
    };

    try {
      if (isEdit) {
        await updateEvent(event.id, data);
        toast.success("Event updated");
      } else {
        await createEvent(data);
        toast.success("Event created");
      }
      router.push("/calendar");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Event" : "Create Event"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={event?.title ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={event?.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              defaultValue={event?.location ?? ""}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={allDay} onCheckedChange={setAllDay} id="allDay" />
            <Label htmlFor="allDay">All day event</Label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">{allDay ? "Date" : "Start"}</Label>
              <Input
                id="startDate"
                name="startDate"
                type={allDay ? "date" : "datetime-local"}
                required
                defaultValue={
                  event
                    ? allDay
                      ? toLocalDateString(event.startDate)
                      : toLocalDateTimeString(event.startDate)
                    : ""
                }
              />
            </div>
            {!allDay && (
              <div className="space-y-2">
                <Label htmlFor="endDate">End</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="datetime-local"
                  defaultValue={
                    event ? toLocalDateTimeString(event.endDate) : ""
                  }
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Recurrence</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">One-off</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurrence !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="recurrenceEnd">Repeats until (optional)</Label>
              <Input
                id="recurrenceEnd"
                name="recurrenceEnd"
                type="date"
                defaultValue={
                  event?.recurrenceEnd
                    ? toLocalDateString(event.recurrenceEnd)
                    : ""
                }
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update Event" : "Create Event"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
