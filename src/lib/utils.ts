import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// CommonMark ends an HTML block at the first blank line, which fragments
// HTML pages that an author has formatted with whitespace between tags.
// Browsers don't care about blank lines between tags, so collapse them
// before the content reaches the markdown parser.
export function collapseBlankLinesBetweenTags(content: string): string {
  return content.replace(/>\s*\n(?:\s*\n)+\s*</g, ">\n<");
}
