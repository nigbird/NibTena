import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Allowed image MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

// Risky file formats that should be explicitly blocked
const RISKY_EXTENSIONS = [
  'html', 'htm', 'xhtml', 'xml', 'js', 'jsx', 'ts', 'tsx', 'exe', 'bat', 'cmd', 'sh', 'ps1',
  'vbs', 'jar', 'war', 'php', 'asp', 'aspx', 'jsp', 'py', 'rb', 'pl', 'cgi', 'svg'
];

// Business context types for upload validation
type UploadContext = 'hospital' | 'doctor' | 'profile' | 'general';

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

// Check for risky file formats using magic bytes
function detectRiskyFormat(buffer: Buffer, filename: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  // Check extension against risky list
  if (RISKY_EXTENSIONS.includes(extension)) {
    return true;
  }

  // Check magic bytes for risky formats
  const bufferStr = buffer.slice(0, 100).toString('ascii', 0, 100);
  
  // HTML/XML detection
  if (bufferStr.trim().startsWith('<!DOCTYPE') || 
      bufferStr.trim().startsWith('<?xml') ||
      bufferStr.trim().startsWith('<html') ||
      bufferStr.trim().startsWith('<script')) {
    return true;
  }

  // JavaScript detection
  if (bufferStr.includes('function') && bufferStr.includes('var') && extension === 'js') {
    return true;
  }

  // SVG can contain scripts, so we block it
  if (extension === 'svg' || bufferStr.trim().startsWith('<svg')) {
    return true;
  }

  return false;
}

// Structured logging for upload attempts
interface UploadLog {
  timestamp: string;
  ip: string | null;
  userAgent: string | null;
  filename: string;
  fileSize: number;
  fileType: string | null;
  context: string;
  success: boolean;
  reason?: string;
  anomaly?: string;
}

function logUploadAttempt(log: UploadLog) {
  const logEntry = {
    ...log,
    timestamp: new Date().toISOString(),
  };

  // Log to console with structured format
  if (log.success) {
    console.log('[UPLOAD_SUCCESS]', JSON.stringify(logEntry));
  } else {
    console.warn('[UPLOAD_FAILURE]', JSON.stringify(logEntry));
  }

  // Detect and log anomalies
  if (log.fileSize > MAX_FILE_SIZE * 0.9) {
    console.warn('[UPLOAD_ANOMALY] Large file detected:', JSON.stringify({ ...logEntry, anomaly: 'LARGE_FILE' }));
  }

  if (log.fileType && !ALLOWED_MIME_TYPES.includes(log.fileType)) {
    console.warn('[UPLOAD_ANOMALY] Unusual file type:', JSON.stringify({ ...logEntry, anomaly: 'UNUSUAL_FILE_TYPE' }));
  }
}

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const uploadContext = (request.headers.get('x-upload-context') || 'general') as UploadContext;

  try {
    // API key protection
    const providedKey = request.headers.get('x-upload-api-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const configuredKey = process.env.UPLOAD_API_KEY || '';
    let user: any = null;
    try {
      const perms = await import('../../../lib/permissions');
      if (perms && typeof perms.getVerifiedUser === 'function') {
        user = await perms.getVerifiedUser().catch(() => null);
      }
    } catch (e) {
      console.error('[upload] failed to import permissions/getVerifiedUser', e);
      user = null;
    }
    const isSessionAuthorized = !!user && (user.role === 'superadmin' || user.role === 'hospital' || user.role === 'doctor');
    const hasValidKey = !!configuredKey && providedKey === configuredKey;

    if (configuredKey && !hasValidKey && !isSessionAuthorized) {
      logUploadAttempt({
        timestamp: new Date().toISOString(),
        ip: clientIp,
        userAgent,
        filename: 'unknown',
        fileSize: 0,
        fileType: null,
        context: uploadContext,
        success: false,
        reason: 'UNAUTHORIZED'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      logUploadAttempt({
        timestamp: new Date().toISOString(),
        ip: clientIp,
        userAgent,
        filename: 'none',
        fileSize: 0,
        fileType: null,
        context: uploadContext,
        success: false,
        reason: 'NO_FILE_PROVIDED'
      });
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      logUploadAttempt({
        timestamp: new Date().toISOString(),
        ip: clientIp,
        userAgent,
        filename: file.name,
        fileSize: file.size,
        fileType: file.type,
        context: uploadContext,
        success: false,
        reason: 'FILE_TOO_LARGE',
        anomaly: 'LARGE_FILE'
      });
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    // Validate file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      logUploadAttempt({
        timestamp: new Date().toISOString(),
        ip: clientIp,
        userAgent,
        filename: file.name,
        fileSize: file.size,
        fileType: file.type,
        context: uploadContext,
        success: false,
        reason: 'INVALID_EXTENSION'
      });
      return NextResponse.json({ error: 'Invalid file extension. Only image files are allowed.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check for risky file formats BEFORE processing
    if (detectRiskyFormat(buffer, file.name)) {
      logUploadAttempt({
        timestamp: new Date().toISOString(),
        ip: clientIp,
        userAgent,
        filename: file.name,
        fileSize: file.size,
        fileType: file.type,
        context: uploadContext,
        success: false,
        reason: 'RISKY_FILE_FORMAT',
        anomaly: 'SECURITY_THREAT'
      });
      return NextResponse.json({ error: 'Risky file format detected. Only image files are allowed.' }, { status: 400 });
    }

    // Detect image type using magic bytes
    const detected = detectImageType(buffer);
    if (!detected) {
      logUploadAttempt({
        timestamp: new Date().toISOString(),
        ip: clientIp,
        userAgent,
        filename: file.name,
        fileSize: file.size,
        fileType: file.type,
        context: uploadContext,
        success: false,
        reason: 'INVALID_IMAGE_MAGIC_BYTES'
      });
      return NextResponse.json({ error: 'Invalid image file. File content does not match image format.' }, { status: 400 });
    }

    // Validate MIME type from client against detected magic bytes
    const normalizedClientMime = file.type.toLowerCase().replace(/\/x-/, '/');
    const normalizedDetectedMime = detected.mime.toLowerCase();
    
    // Allow some flexibility (e.g., image/jpg vs image/jpeg)
    const mimeMatches = normalizedClientMime === normalizedDetectedMime ||
                        (normalizedClientMime === 'image/jpg' && normalizedDetectedMime === 'image/jpeg') ||
                        (normalizedClientMime === 'image/jpeg' && normalizedDetectedMime === 'image/jpeg');

    if (!mimeMatches && file.type) {
      logUploadAttempt({
        timestamp: new Date().toISOString(),
        ip: clientIp,
        userAgent,
        filename: file.name,
        fileSize: file.size,
        fileType: file.type,
        context: uploadContext,
        success: false,
        reason: 'MIME_TYPE_MISMATCH',
        anomaly: 'MIME_TYPE_MISMATCH'
      });
      return NextResponse.json({ 
        error: 'File MIME type does not match file content. Possible file type spoofing detected.' 
      }, { status: 400 });
    }

    // Business logic validation: restrict file types per context
    // For now, all contexts allow the same image types, but this can be extended
    if (uploadContext === 'hospital' || uploadContext === 'doctor' || uploadContext === 'profile') {
      // All image types are allowed for these contexts
      // Future: could restrict to specific types per context
    }

    // Generate unique filename using a cryptographically secure random generator
    // Use random bytes instead of Math.random for security and uniqueness
    const randomString = randomBytes(12).toString('hex');
    const filename = `${Date.now()}_${randomString}.${detected.ext}`;

    // Ensure uploads directory exists and is writable. On IIS the app
    // process must have write permissions to this folder; if it doesn't
    // the creation or test-write will fail and we return a clear error.
    const uploadsDir = join(process.cwd(), 'uploads');
    try {
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Test write permission by creating and removing a small temp file.
      const testFile = join(uploadsDir, '.upload_write_test');
      try {
        await writeFile(testFile, 'ok');
        await unlink(testFile);
      } catch (e) {
        console.error('[upload] uploads directory not writable:', e);
        logUploadAttempt({
          timestamp: new Date().toISOString(),
          ip: clientIp,
          userAgent,
          filename: file.name,
          fileSize: file.size,
          fileType: file.type,
          context: uploadContext,
          success: false,
          reason: 'FS_PERMISSION_DENIED'
        });
        return NextResponse.json({ error: 'Server cannot write uploads folder. Grant write permission to the app process.' }, { status: 500 });
      }
    } catch (e) {
      console.error('[upload] failed to ensure uploads dir:', e);
      logUploadAttempt({
        timestamp: new Date().toISOString(),
        ip: clientIp,
        userAgent,
        filename: file.name || 'unknown',
        fileSize: file.size || 0,
        fileType: file.type || null,
        context: uploadContext,
        success: false,
        reason: 'UPLOAD_DIR_CREATE_FAILED'
      });
      return NextResponse.json({ error: 'Failed to prepare uploads directory' }, { status: 500 });
    }

    // Save the file
    const filePath = join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    // Public URL (make sure you have a route to serve these files)
    const publicUrl = `/api/uploads/${filename}`;

    // Log successful upload
    logUploadAttempt({
      timestamp: new Date().toISOString(),
      ip: clientIp,
      userAgent,
      filename,
      fileSize: file.size,
      fileType: detected.mime,
      context: uploadContext,
      success: true
    });

    return NextResponse.json({
      success: true,
      filename,
      url: publicUrl,
      size: file.size,
      type: detected.mime
    });

  } catch (error) {
    logUploadAttempt({
      timestamp: new Date().toISOString(),
      ip: clientIp,
      userAgent,
      filename: 'unknown',
      fileSize: 0,
      fileType: null,
      context: uploadContext,
      success: false,
      reason: 'SERVER_ERROR'
    });
    console.error('[UPLOAD_ERROR]', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: clientIp,
      userAgent
    });
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
