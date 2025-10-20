/**
 * Utility functions for image upload and management
 */

export interface UploadResponse {
  success: boolean;
  filename?: string;
  url?: string;
  size?: number;
  type?: string;
  error?: string;
}

/**
 * Upload an image file to the server
 * @param file - The file to upload
 * @returns Promise<UploadResponse>
 */
export async function uploadImage(file: File): Promise<UploadResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Upload failed:', result.error);
      return {
        success: false,
        error: result.error || 'Upload failed',
      };
    }

    return result;
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: 'Network error during upload',
    };
  }
}

/**
 * Get the public URL for an uploaded image
 * @param filename - The filename of the uploaded image
 * @returns string - The public URL
 */
export function getImageUrl(filename: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/upload/${filename}`;
}

/**
 * Validate if a file is a valid image
 * @param file - The file to validate
 * @returns boolean
 */
export function isValidImageFile(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  return allowedTypes.includes(file.type) && file.size <= maxSize;
}

/**
 * Get file size in human readable format
 * @param bytes - File size in bytes
 * @returns string - Human readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
