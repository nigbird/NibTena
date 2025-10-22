'use server';

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Saves an uploaded file to the root /public/uploads directory.
 * @param file The File object to save.
 * @returns The dynamic API URL of the saved file (e.g., /api/uploads/filename.jpg).
 */
export async function saveImage(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Use a timestamp to make the filename unique
  const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
  
  // Save to a directory at the root of the project, NOT in /public
  const uploadsDir = join(process.cwd(), 'public', 'uploads');
  if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
  }

  const path = join(uploadsDir, filename);
  
  await writeFile(path, buffer);

  // Return the path that will be publicly available
  return `/uploads/${filename}`;
}
