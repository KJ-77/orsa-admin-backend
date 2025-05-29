# Product Images Implementation Guide

This guide explains how to use the product images functionality in your Orsa e-commerce backend.

## Overview

The product images system allows you to:

- Upload product images to AWS S3 with public read access
- Delete images from S3
- Store image metadata in MySQL database
- Handle multiple images per product with primary image support

## S3 Bucket Configuration

### Bucket Details

- **Name**: `orsa-admin-backend-product-images-{stage}` (e.g., `orsa-admin-backend-product-images-dev`)
- **Region**: `eu-west-3` (same as your other AWS resources)
- **Access**: Public read, private write/delete
- **CORS**: Enabled for browser uploads

### Security

✅ **Public READ**: Anyone can view images via public URLs  
❌ **Public WRITE**: Only Lambda functions can upload/delete  
❌ **Public DELETE**: Only Lambda functions can delete

This configuration is perfect for e-commerce product images as they need to be publicly viewable but protected from unauthorized uploads/deletions.

## API Endpoints

### Upload Image

The API supports **two upload methods**:

#### Method 1: Binary Upload (Recommended)

Upload images directly as binary data without Base64 conversion:

```http
POST /products/images/upload
Content-Type: image/jpeg
X-Filename: product-image.jpg

[Binary image data]
```

**Headers:**

- `Content-Type`: The MIME type of the image (e.g., `image/jpeg`, `image/png`)
- `X-Filename`: (Optional) Custom filename for the uploaded image

**Frontend JavaScript Example:**

```javascript
// Using File input
const uploadImage = async (file) => {
  const response = await fetch("/products/images/upload", {
    method: "POST",
    headers: {
      "Content-Type": file.type,
      "X-Filename": file.name,
    },
    body: file,
  });
  return response.json();
};

// Using with React file input
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (file) {
    const result = await uploadImage(file);
    console.log("Upload result:", result);
  }
};
```

**cURL Example:**

```bash
curl -X POST \
  -H "Content-Type: image/jpeg" \
  -H "X-Filename: my-product.jpg" \
  --data-binary @/path/to/image.jpg \
  https://your-api-id.execute-api.eu-west-3.amazonaws.com/products/images/upload
```

#### Method 2: Base64 Upload (Legacy Support)

Upload images as Base64 encoded JSON payload:

```http
POST /products/images/upload
Content-Type: application/json

{
  "image": "base64-encoded-image-data",
  "fileName": "product-image.jpg",
  "contentType": "image/jpeg"
}
```

#### Testing in Insomnia/Postman

**Binary Upload Test:**

1. Create a new POST request
2. Set URL to: `https://your-api-id.execute-api.eu-west-3.amazonaws.com/products/images/upload`
3. Set Headers:
   - `Content-Type`: `image/jpeg` (or appropriate image type)
   - `X-Filename`: `test-image.jpg` (optional)
4. Body: Select "Binary file" and choose your image file
5. Send the request

**Base64 Upload Test:**

1. Create a new POST request with JSON body
2. Use the Base64 format shown above
3. Convert your image to Base64 first

**Response (Both Methods):**

```json
{
  "message": "Image uploaded successfully",
  "image": {
    "key": "products/12345678-1234-1234-1234-123456789abc.jpg",
    "url": "https://orsa-admin-backend-product-images-dev.s3.eu-west-3.amazonaws.com/products/12345678-1234-1234-1234-123456789abc.jpg",
    "bucket": "orsa-admin-backend-product-images-dev",
    "contentType": "image/jpeg",
    "size": 125678,
    "fileName": "product-image.jpg"
  }
}
```

### Delete Image

```http
DELETE /products/images/{imageKey}
```

Example:

```http
DELETE /products/images/products%2F12345678-1234-1234-1234-123456789abc.jpg
```

**Response:**

```json
{
  "message": "Image deleted successfully",
  "key": "products/12345678-1234-1234-1234-123456789abc.jpg"
}
```

## Database Schema

### ProductImages Table

```sql
CREATE TABLE product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url VARCHAR(512) NOT NULL,     -- Full S3 URL
    image_key VARCHAR(255) NOT NULL,     -- S3 key for management
    alt_text VARCHAR(255) DEFAULT NULL,  -- SEO and accessibility
    display_order INT DEFAULT 0,         -- Image ordering
    is_primary BOOLEAN DEFAULT FALSE,    -- Primary product image
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_primary_per_product (product_id, is_primary),
    INDEX idx_product_id (product_id),
    INDEX idx_display_order (product_id, display_order)
);
```

### Why Store Both URL and Key?

- **image_url**: Ready-to-use full URL for frontend display
- **image_key**: S3 key for backend operations (delete, management)

## Frontend Integration Examples

### React Component Example

```jsx
import React, { useState } from "react";

function ProductImageUpload({ productId, onImageUploaded }) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      alert("File size must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      // Convert to base64
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          // Remove data URL prefix to get pure base64
          const base64String = e.target.result.split(",")[1];
          resolve(base64String);
        };
        reader.readAsDataURL(file);
      });

      // Upload to S3
      const response = await fetch("/products/images/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          fileName: file.name,
          contentType: file.type,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Save to database
        await saveImageToDatabase(productId, result.image);
        onImageUploaded(result.image.url);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const saveImageToDatabase = async (productId, imageData) => {
    await fetch(`/products/${productId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageData.url,
        image_key: imageData.key,
        alt_text: imageData.fileName,
        is_primary: false, // Set to true for primary image
      }),
    });
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

### Vanilla JavaScript Example

```javascript
// Upload with file input
async function uploadProductImage(file) {
  // Convert file to base64
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result.split(",")[1];
      resolve(base64String);
    };
    reader.readAsDataURL(file);
  });

  // Upload to S3
  const response = await fetch("/products/images/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: base64,
      fileName: file.name,
      contentType: file.type,
    }),
  });

  return response.json();
}

// Delete image
async function deleteProductImage(imageKey) {
  const response = await fetch(
    `/products/images/${encodeURIComponent(imageKey)}`,
    {
      method: "DELETE",
    }
  );

  return response.json();
}
```

## Common Database Queries

### Add Image to Product

```sql
INSERT INTO product_images (product_id, image_url, image_key, alt_text, display_order, is_primary)
VALUES (1, 'https://bucket.s3.region.amazonaws.com/key.jpg', 'products/key.jpg', 'Product image', 1, TRUE);
```

### Get Product with Images

```sql
SELECT
    p.*,
    pi.id as image_id,
    pi.image_url,
    pi.alt_text,
    pi.display_order,
    pi.is_primary
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id
WHERE p.id = 1
ORDER BY pi.display_order ASC;
```

### Get Primary Image Only

```sql
SELECT p.*, pi.image_url as primary_image
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
WHERE p.id = 1;
```

### Update Primary Image

```sql
-- Unset current primary
UPDATE product_images SET is_primary = FALSE WHERE product_id = 1;

-- Set new primary
UPDATE product_images SET is_primary = TRUE WHERE id = 5 AND product_id = 1;
```

## File Specifications

### Supported Formats

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)
- SVG (`.svg`)

### File Size Limits

- **Maximum**: 5MB per image
- **Recommended**: Under 1MB for web optimization

### Image Naming

- Auto-generated UUID-based names prevent conflicts
- Format: `products/{uuid}.{extension}`
- Example: `products/12345678-1234-1234-1234-123456789abc.jpg`

## Deployment

### Deploy Changes

```bash
cd orsa-admin-backend
npm install
serverless deploy
```

### Environment Variables

The following are automatically set:

- `S3_BUCKET_NAME`: Your bucket name
- `S3_REGION`: Your AWS region

### Required Permissions

Lambda functions automatically get:

- `s3:PutObject` - Upload images
- `s3:PutObjectAcl` - Set public read permissions
- `s3:DeleteObject` - Delete images
- `s3:GetObject` - Read images (for validation)
- `s3:ListBucket` - List bucket contents

## Testing

### Test Image Upload

1. Place a test image in your project directory
2. Update the API URL in `test-image-upload.js`
3. Run: `node test-image-upload.js`

### Manual Testing

```bash
# Test upload via curl
curl -X POST https://your-api-url/products/images/upload \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64-encoded-data",
    "fileName": "test.jpg",
    "contentType": "image/jpeg"
  }'

# Test delete
curl -X DELETE https://your-api-url/products/images/products%2Fsome-uuid.jpg
```

## Best Practices

### Frontend

1. **Validate files** before upload (type, size)
2. **Show upload progress** for better UX
3. **Handle errors gracefully** with user-friendly messages
4. **Optimize images** before upload to reduce size
5. **Use alt text** for accessibility and SEO

### Backend

1. **Store both URL and key** for flexibility
2. **Set display order** for consistent image ordering
3. **Use primary flag** to identify main product image
4. **Clean up database** when deleting images
5. **Implement image compression** for large files

### Security

1. **Validate content types** on both frontend and backend
2. **Limit file sizes** to prevent abuse
3. **Use UUID-based names** to prevent guessing URLs
4. **Monitor S3 costs** with CloudWatch alerts
5. **Implement rate limiting** for upload endpoints

## Troubleshooting

### Common Issues

#### Upload Fails with "Access Denied"

- Check IAM permissions in `serverless.yml`
- Verify S3 bucket policy allows Lambda writes
- Ensure bucket exists and is in correct region

#### Images Not Publicly Accessible

- Check bucket public access settings
- Verify bucket policy allows public reads
- Confirm object ACL is set to public-read

#### Large Upload Timeouts

- Increase Lambda timeout for upload function (currently 60s)
- Consider implementing multipart uploads for large files
- Add client-side image compression

#### Database Foreign Key Errors

- Ensure product exists before adding images
- Check product_id references valid products table entry

### Debug Steps

1. Check CloudWatch logs for detailed error messages
2. Test S3 permissions with AWS CLI
3. Verify database connection and schema
4. Test with small images first
5. Check network connectivity and CORS settings

## Cost Considerations

### S3 Storage Costs

- **Standard**: ~$0.023 per GB per month
- **Requests**: ~$0.0004 per 1,000 PUT requests
- **Transfer**: Free for first 1GB/month outbound

### Optimization Tips

1. **Compress images** before upload
2. **Use WebP format** when possible
3. **Implement lifecycle policies** for old images
4. **Monitor usage** with AWS Cost Explorer
5. **Consider S3 Intelligent Tiering** for long-term storage
