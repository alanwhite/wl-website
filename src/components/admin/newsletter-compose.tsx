"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendNewsletter } from "@/lib/actions/newsletter";
import { toast } from "sonner";

export function NewsletterCompose() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  async function handleSend(formData: FormData) {
    if (!confirm("Send this newsletter to all subscribers? This cannot be undone.")) return;
    setLoading(true);
    try {
      await sendNewsletter(formData);
      toast.success("Newsletter sent");
      setSubject("");
      setContent("");
      setPreview(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send newsletter");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Compose Newsletter</CardTitle>
      </CardHeader>
      <CardContent>
        {preview ? (
          <div className="space-y-4">
            <div className="rounded border p-4">
              <h2 className="mb-2 text-lg font-bold">{subject}</h2>
              <div className="whitespace-pre-wrap text-sm text-muted-foreground">{content}</div>
            </div>
            <div className="flex gap-2">
              <form action={handleSend}>
                <input type="hidden" name="subject" value={subject} />
                <input type="hidden" name="content" value={content} />
                <Button type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Confirm & Send"}
                </Button>
              </form>
              <Button variant="outline" onClick={() => setPreview(false)}>
                Edit
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Newsletter subject line"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                placeholder="Write your newsletter content here..."
              />
            </div>
            <Button
              onClick={() => setPreview(true)}
              disabled={!subject.trim() || !content.trim()}
            >
              Preview
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
