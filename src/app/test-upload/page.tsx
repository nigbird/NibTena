import { ImageUpload } from '@/components/ImageUpload';
import { type UploadResponse } from '@/lib/image-utils';

export default function TestUploadPage() {
  const handleUploadSuccess = (result: UploadResponse) => {
  };

  const handleUploadError = (error: string) => {
    console.error('Upload failed:', error);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Image Upload Test</h1>
        <p className="text-gray-600 mb-8">
          This page demonstrates the image upload functionality. You can upload images 
          that will be stored in the public/uploads directory and served via the API.
        </p>
        
        <ImageUpload 
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">API Endpoints:</h2>
          <ul className="space-y-1 text-sm text-gray-600">
            <li><strong>POST /api/upload</strong> - Upload an image file</li>
            <li><strong>GET /api/upload/[filename]</strong> - Serve an uploaded image</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Usage in Components:</h2>
          <pre className="text-sm text-gray-600 overflow-x-auto">
{`import { ImageUpload } from '@/components/ImageUpload';
import { uploadImage } from '@/lib/image-utils';

// Use the component
<ImageUpload 
  onUploadSuccess={(result) => {
    // Handle successful upload
  }}
  onUploadError={(error) => {
    // Handle upload error
    console.error('Upload failed:', error);
  }}
/>

// Or use the utility function directly
const result = await uploadImage(file);
if (result.success) {
  // Update database with result.url
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
