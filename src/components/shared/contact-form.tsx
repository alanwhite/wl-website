"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContact } from "@/lib/actions/contact";
import { toast } from "sonner";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
    };
  }
}

export function ContactForm() {
  const [pending, setPending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !turnstileRef.current) return;

    function renderWidget() {
      if (!window.turnstile || !turnstileRef.current) return;
      if (widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        theme: "auto",
      });
    }

    if (!document.getElementById("turnstile-script")) {
      const script = document.createElement("script");
      script.id = "turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => renderWidget();
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    }
  }, [siteKey]);

  async function handleSubmit(formData: FormData) {
    if (siteKey && !turnstileToken) {
      toast.error("Please complete the verification check.");
      return;
    }
    setPending(true);
    try {
      formData.set("cf-turnstile-response", turnstileToken);
      await submitContact(formData);
      toast.success("Message sent! We'll get back to you soon.");
      const form = document.getElementById("contact-form") as HTMLFormElement;
      form?.reset();
      setTurnstileToken("");
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
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
          {siteKey && <div ref={turnstileRef} />}
          <Button type="submit" className="w-full" disabled={pending || (!!siteKey && !turnstileToken)}>
            {pending ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
