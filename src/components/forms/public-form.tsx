"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicFormFields } from "@/components/shared/dynamic-form";
import { submitForm } from "@/lib/actions/forms";
import { toast } from "sonner";
import Markdown from "react-markdown";
import type { RegistrationField } from "@/lib/config";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
    };
  }
}

interface PublicFormProps {
  formId: string;
  title: string;
  description?: string | null;
  fields: RegistrationField[];
  userName?: string | null;
  userEmail?: string | null;
}

export function PublicFormComponent({
  formId,
  title,
  description,
  fields,
  userName,
  userEmail,
}: PublicFormProps) {
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <h2 className="text-xl font-semibold">Thank you!</h2>
          <p className="mt-2 text-muted-foreground">
            Your submission has been received. We&apos;ll be in touch.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(formData: FormData) {
    if (siteKey && !turnstileToken) {
      toast.error("Please complete the verification check.");
      return;
    }
    setPending(true);
    try {
      formData.set("cf-turnstile-response", turnstileToken);
      await submitForm(formId, formData);
      setSubmitted(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit. Please try again.");
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        setTurnstileToken("");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <CardDescription className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown>{description}</Markdown>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={userName ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={userEmail ?? ""}
            />
          </div>
          <DynamicFormFields fields={fields} />
          {siteKey && <div ref={turnstileRef} />}
          <Button
            type="submit"
            className="w-full"
            disabled={pending || (!!siteKey && !turnstileToken)}
          >
            {pending ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
