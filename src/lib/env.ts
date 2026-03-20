import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().min(1, "AUTH_URL is required"),
});

const optionalEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
  AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  AUTH_FACEBOOK_ID: process.env.AUTH_FACEBOOK_ID,
  AUTH_FACEBOOK_SECRET: process.env.AUTH_FACEBOOK_SECRET,
};

// Warn about missing optional vars
if (!optionalEnv.RESEND_API_KEY) {
  console.warn("[env] RESEND_API_KEY not set — emails will be logged to console");
}
if (!optionalEnv.EMAIL_FROM) {
  console.warn("[env] EMAIL_FROM not set — using noreply@example.com");
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[env] Missing required environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  // Don't exit during build phase — env vars aren't available yet
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    process.exit(1);
  }
}

export const env = parsed.data;
