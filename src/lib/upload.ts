import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_BASE = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

export async function saveFile(
  file: File,
  subdir: string
): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File too large. Maximum size is 5MB.");
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG.");
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const fileName = `${randomUUID()}.${ext}`;
  const dir = path.join(UPLOAD_BASE, subdir);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const filePath = path.join(dir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return `/uploads/${subdir}/${fileName}`;
}

export async function deleteFile(urlPath: string): Promise<void> {
  const filePath = path.join(process.cwd(), urlPath);
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}
