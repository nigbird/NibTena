# Image Upload System

This document describes the secure image upload and retrieval system implemented in the appointment project.

## Overview

The image upload system allows users to upload images that are stored in the `public/uploads` directory and served via API endpoints. The system includes proper validation, security measures, and database integration.

## Features

- **Secure File Upload**: Validates file types and sizes before upload
- **Image Storage**: Files are stored in `public/uploads` directory
- **API Endpoints**: RESTful API for upload and retrieval
- **Database Integration**: Image URLs are stored in the database
- **Type Safety**: Full TypeScript support with proper types
- **Error Handling**: Comprehensive error handling and logging
- **File Validation**: Supports JPEG, PNG, GIF, and WebP formats up to 5MB

## API Endpoints

### POST /api/upload

Upload an image file.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: FormData with 'file' field

**Response:**
```json
{
  "success": true,
  "filename": "1703123456789_abc123def456.jpg",
  "url": "http://localhost:9002/api/upload/1703123456789_abc123def456.jpg",
  "size": 1024000,
  "type": "image/jpeg"
}
```

**Error Response:**
```json
{
  "error": "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
}
```

### GET /api/upload/[filename]

Retrieve an uploaded image.

**Request:**
- Method: GET
- URL: `/api/upload/{filename}`

**Response:**
- Content-Type: Appropriate MIME type (image/jpeg, image/png, etc.)
- Body: Image file data
- Headers: Cache-Control for optimal performance

## Database Schema

The following fields have been added to store image URLs:

### Hospital Model
```prisma
model Hospital {
  // ... existing fields
  imageId         String
  imageUrl        String?  // URL to the uploaded image
  // ... other fields
}
```

### Doctor Model
```prisma
model Doctor {
  // ... existing fields
  imageId         String
  imageUrl        String?  // URL to the uploaded image
  // ... other fields
}
```

## Usage

### Using the ImageUpload Component

```tsx
import { ImageUpload } from '@/components/ImageUpload';

function MyComponent() {
  const handleUploadSuccess = (result) => {
    console.log('Image uploaded:', result.url);
    // Update database with the image URL
  };

  const handleUploadError = (error) => {
    console.error('Upload failed:', error);
  };

  return (
    <ImageUpload 
      onUploadSuccess={handleUploadSuccess}
      onUploadError={handleUploadError}
    />
  );
}
```

### Using the Utility Functions

```tsx
import { uploadImage, getImageUrl, isValidImageFile } from '@/lib/image-utils';

// Upload a file
const result = await uploadImage(file);
if (result.success) {
  console.log('Image URL:', result.url);
}

// Get image URL from filename
const imageUrl = getImageUrl('filename.jpg');

// Validate file before upload
if (isValidImageFile(file)) {
  // Proceed with upload
}
```

## Security Features

1. **File Type Validation**: Only allows specific image formats
2. **File Size Limits**: Maximum 5MB per file
3. **Filename Sanitization**: Prevents directory traversal attacks
4. **Unique Filenames**: Timestamp + random string prevents conflicts
5. **MIME Type Detection**: Proper content-type headers for served files

## File Structure

```
public/
  uploads/           # Directory for uploaded images
    [timestamp]_[random].jpg
    [timestamp]_[random].png
    ...

src/
  app/
    api/
      upload/
        route.ts              # POST endpoint for uploads
        [filename]/
          route.ts            # GET endpoint for serving images
  components/
    ImageUpload.tsx           # React component for uploads
  lib/
    image-utils.ts            # Utility functions
```

## Configuration

### Environment Variables

Make sure to set the following environment variable:

```env
NEXT_PUBLIC_BASE_URL=http://localhost:9002
```

This is used to generate the public URLs for uploaded images.

### File Size Limits

The maximum file size is set to 5MB. To change this, modify the `MAX_FILE_SIZE` constant in `src/app/api/upload/route.ts`.

### Allowed File Types

Currently supports:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

To modify allowed types, update the `ALLOWED_TYPES` array in `src/app/api/upload/route.ts`.

## Testing

Visit `/test-upload` to test the image upload functionality. This page includes:

- Drag and drop upload interface
- File validation feedback
- Upload progress indication
- Image preview
- Error handling demonstration

## Error Handling

The system provides comprehensive error handling:

- **400 Bad Request**: Invalid file type or size
- **404 Not Found**: File not found when serving
- **500 Internal Server Error**: Server-side errors during upload/retrieval

All errors are logged to the console for debugging purposes.

## Performance Considerations

- Images are served with appropriate cache headers
- File validation happens before disk I/O
- Unique filenames prevent conflicts
- Proper MIME types ensure correct browser handling

## Future Enhancements

Potential improvements could include:

1. **Image Resizing**: Automatic thumbnail generation
2. **Cloud Storage**: Integration with AWS S3 or similar
3. **Image Optimization**: Compression and format conversion
4. **CDN Integration**: Faster image delivery
5. **Batch Upload**: Multiple file upload support
6. **Image Metadata**: EXIF data extraction and storage
