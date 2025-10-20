import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

    // Validate filename to prevent directory traversal attacks
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.error(`Invalid filename: ${filename}`);
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Construct file path
    const filePath = join(process.cwd(), 'public', 'uploads', filename);

    // Check if file exists
    if (!existsSync(filePath)) {
      console.error(`File not found: ${filename}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine MIME type based on file extension
    const extension = filename.split('.').pop()?.toLowerCase();
    let mimeType = 'application/octet-stream';

    switch (extension) {
      case 'jpg':
      case 'jpeg':
        mimeType = 'image/jpeg';
        break;
      case 'png':
        mimeType = 'image/png';
        break;
      case 'gif':
        mimeType = 'image/gif';
        break;
      case 'webp':
        mimeType = 'image/webp';
        break;
      default:
        mimeType = 'application/octet-stream';
    }

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Content-Length', fileBuffer.length.toString());
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    console.log(`Serving file: ${filename} (${mimeType})`);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
