import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const UPLOAD_BASE = path.join(process.cwd(), "uploads");

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const filePath = path.join(UPLOAD_BASE, ...segments);

  // Prevent path traversal
  if (!filePath.startsWith(UPLOAD_BASE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  const buffer = await readFile(filePath);
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  // SVGs can contain embedded JavaScript — sandbox them
  if (ext === ".svg") {
    headers["Content-Security-Policy"] = "sandbox";
    headers["Content-Disposition"] = "inline; filename=\"image.svg\"";
  }

  return new NextResponse(buffer, { headers });
}
