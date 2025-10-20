'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadImage, isValidImageFile, formatFileSize, type UploadResponse } from '@/lib/image-utils';

interface ImageUploadProps {
  onUploadSuccess?: (result: UploadResponse) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export function ImageUpload({ onUploadSuccess, onUploadError, className }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setUploadResult(null);

    // Validate file
    if (!isValidImageFile(file)) {
      const errorMsg = 'Please select a valid image file (JPEG, PNG, GIF, WebP) under 5MB.';
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadImage(file);
      setUploadResult(result);

      if (result.success) {
        onUploadSuccess?.(result);
      } else {
        setError(result.error || 'Upload failed');
        onUploadError?.(result.error || 'Upload failed');
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred during upload.';
      setError(errorMsg);
      onUploadError?.(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const resetUpload = () => {
    setUploadResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Image Upload
        </CardTitle>
        <CardDescription>
          Upload images for hospitals, doctors, or other content. Supports JPEG, PNG, GIF, and WebP formats up to 5MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isUploading}
          />
          
          {isUploading ? (
            <div className="space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500">JPEG, PNG, GIF, WebP up to 5MB</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {uploadResult?.success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>Image uploaded successfully!</p>
                <div className="text-sm space-y-1">
                  <p><strong>Filename:</strong> {uploadResult.filename}</p>
                  <p><strong>Size:</strong> {formatFileSize(uploadResult.size || 0)}</p>
                  <p><strong>Type:</strong> {uploadResult.type}</p>
                  <p><strong>URL:</strong> 
                    <a 
                      href={uploadResult.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      {uploadResult.url}
                    </a>
                  </p>
                </div>
                <div className="mt-3">
                  <img 
                    src={uploadResult.url} 
                    alt="Uploaded preview" 
                    className="max-w-full h-32 object-cover rounded border"
                  />
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {uploadResult && (
          <div className="flex gap-2">
            <Button onClick={resetUpload} variant="outline" size="sm">
              <X className="h-4 w-4 mr-1" />
              Upload Another
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
