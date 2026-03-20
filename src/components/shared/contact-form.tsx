"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContact } from "@/lib/actions/contact";
import { toast } from "sonner";

export function ContactForm() {
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      await submitContact(formData);
      toast.success("Message sent! We'll get back to you soon.");
      const form = document.getElementById("contact-form") as HTMLFormElement;
      form?.reset();
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Us</CardTitle>
        <CardDescription>
          Have a question? Send us a message and we&apos;ll get back to you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="contact-form" action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" rows={5} required />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
