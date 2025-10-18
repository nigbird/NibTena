
'use server';

import { writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Saves an uploaded file to the public/uploads directory.
 * @param file The File object to save.
 * @returns The public URL of the saved file (e.g., /uploads/filename.jpg).
 */
export async function saveImage(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Use a timestamp to make the filename unique
  const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
  const path = join(process.cwd(), 'public/uploads', filename);
  
  await writeFile(path, buffer);

  return `/uploads/${filename}`;
}
