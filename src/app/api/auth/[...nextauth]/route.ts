import { handlers } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

const authLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  try {
    await authLimiter.check(5, ip);
  } catch {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return handlers.POST(req);
}
