
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomBytes } from 'crypto';

// Maximum file size: 5MB (matches /api/upload)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Only URLs produced by our own upload handlers are accepted as image URLs.
const SAFE_UPLOAD_URL = /^\/api\/uploads\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|gif|webp)$/;

export class ImageValidationError extends Error {}

// Detect image type using magic bytes. SVG and anything else is rejected.
function detectImageType(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (buffer.length >= 6) {
    const sig = buffer.subarray(0, 6).toString('ascii');
    if (sig === 'GIF89a' || sig === 'GIF87a') return { mime: 'image/gif', ext: 'gif' };
  }
  if (buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

/**
 * Returns true if the URL points to a file served by /api/uploads with a safe image extension.
 */
export function isSafeUploadUrl(url: string): boolean {
  return SAFE_UPLOAD_URL.test(url);
}

/**
 * Validates and saves an uploaded image to the root /uploads directory.
 * The client-supplied filename is never used; the stored name is random and
 * its extension is derived from the detected content type.
 * @throws ImageValidationError if the file is not a JPEG, PNG, GIF or WebP image.
 * @returns The dynamic API URL of the saved file (e.g., /api/uploads/filename.jpg).
 */
export async function saveImage(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new ImageValidationError('File too large. Maximum size is 5MB.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const detected = detectImageType(buffer);
  if (!detected) {
    throw new ImageValidationError('Invalid image. Only JPEG, PNG, GIF and WebP files are allowed.');
  }

  const filename = `${Date.now()}_${randomBytes(12).toString('hex')}.${detected.ext}`;

  // Save to a directory at the root of the project, NOT in /public
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  await writeFile(join(uploadsDir, filename), buffer);

  // Return the path to the API route that will serve the image
  return `/api/uploads/${filename}`;
}
