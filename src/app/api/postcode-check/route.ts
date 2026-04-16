import { getAddressData, getTierRules } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

const limiter = rateLimit({ interval: 60_000 });

export async function GET(request: NextRequest) {
  // Rate limit by IP — no auth required for postcode lookup
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  try {
    await limiter.check(10, ip);
  } catch {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const postcode = request.nextUrl.searchParams.get("postcode")?.trim();
  if (!postcode) {
    return NextResponse.json({ error: "Postcode is required" }, { status: 400 });
  }

  if (!UK_POSTCODE_REGEX.test(postcode)) {
    return NextResponse.json({ valid: false, eligible: false, postcode });
  }

  // Normalize: uppercase with single space before inward code
  const normalized = postcode.toUpperCase().replace(/\s+/g, " ").trim();

  const tierRules = await getTierRules();
  const eligiblePostcodes = tierRules?.eligiblePostcodes ?? [];

  // Check if this postcode is in the eligible list
  const eligible =
    eligiblePostcodes.length > 0 &&
    eligiblePostcodes.some(
      (ep) => ep.toUpperCase().replace(/\s+/g, " ").trim() === normalized,
    );

  // Look up addresses from SiteConfig
  const addressData = await getAddressData();
  const entry = addressData?.[normalized];
  const addresses = entry?.addresses ?? [];
  const town = entry?.town ?? null;

  return NextResponse.json({
    valid: true,
    eligible,
    postcode: normalized,
    addresses,
    town,
  });
}
