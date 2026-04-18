import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_BASE = path.join(process.cwd(), "uploads");
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
];
const ALLOWED_DOCUMENT_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

export async function saveFile(
  file: File,
  subdir: string
): Promise<string> {
  if (file.size > MAX_IMAGE_SIZE) {
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

export async function saveDocument(
  file: File,
  subdir: string
): Promise<{ url: string; fileName: string; fileType: string; fileSize: number }> {
  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error("File too large. Maximum size is 20MB.");
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: images, PDF, Word, Excel, PowerPoint, text.");
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

  return {
    url: `/uploads/${subdir}/${fileName}`,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  };
}

export async function deleteFile(urlPath: string): Promise<void> {
  const filePath = path.resolve(process.cwd(), urlPath);
  if (!filePath.startsWith(UPLOAD_BASE)) {
    throw new Error("Invalid file path");
  }
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}
