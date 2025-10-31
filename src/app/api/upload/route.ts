import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Detect image type using magic numbers
function detectImageType(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mime: 'image/png', ext: 'png' };
  }

  if (buffer.length >= 6 && 
      (buffer.slice(0, 6).toString('ascii') === 'GIF89a' || buffer.slice(0, 6).toString('ascii') === 'GIF87a')) {
    return { mime: 'image/gif', ext: 'gif' };
  }

  if (buffer.length >= 12 && 
      buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
      buffer.slice(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // API key protection
    const providedKey = request.headers.get('x-upload-api-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const configuredKey = process.env.UPLOAD_API_KEY || '';

    if (configuredKey && providedKey !== configuredKey) {
      console.warn('Unauthorized upload attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const detected = detectImageType(buffer);
    if (!detected) {
      return NextResponse.json({ error: 'Invalid image file' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}_${randomString}.${detected.ext}`;

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save the file
    const filePath = join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    // Public URL (make sure you have a route to serve these files)
    const publicUrl = `/api/uploads/${filename}`;

    console.log(`File uploaded successfully: ${filename} (${file.size} bytes, ${detected.mime})`);

    return NextResponse.json({
      success: true,
      filename,
      url: publicUrl,
      size: file.size,
      type: detected.mime
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
