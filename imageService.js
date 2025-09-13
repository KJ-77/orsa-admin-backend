/**
 * imageService.js
 * This module handles S3 operations for product images
 */

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION || process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_REGION = process.env.S3_REGION || process.env.AWS_REGION;

/**
 * Upload an image to S3
 * @param {Buffer} imageBuffer - The image data as a buffer
 * @param {string} contentType - The MIME type of the image (e.g., 'image/jpeg')
 * @param {string} originalName - Original filename for reference
 * @returns {Promise<Object>} Upload result with S3 key and public URL
 */
const uploadImage = async (
  imageBuffer,
  contentType,
  originalName = "image"
) => {
  try {
    // Generate a unique filename
    const fileExtension = getFileExtension(contentType, originalName);
    const uniqueKey = `products/${uuidv4()}${fileExtension}`; // Upload parameters
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: uniqueKey,
      Body: imageBuffer,
      ContentType: contentType,
      // Add cache control for better performance
      CacheControl: "max-age=31536000", // 1 year
      // No ACL needed - bucket policy handles public read access
    };

    // Upload to S3
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Generate the public URL
    const publicUrl = `https://${BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${uniqueKey}`;

    return {
      success: true,
      key: uniqueKey,
      url: publicUrl,
      bucket: BUCKET_NAME,
    };
  } catch (error) {
    console.error("Error uploading image to S3:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Delete an image from S3
 * @param {string} imageKey - The S3 key of the image to delete
 * @returns {Promise<Object>} Deletion result
 */
const deleteImage = async (imageKey) => {
  try {
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: imageKey,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    return {
      success: true,
      message: `Image ${imageKey} deleted successfully`,
    };
  } catch (error) {
    console.error("Error deleting image from S3:", error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Extract S3 key from a full S3 URL
 * @param {string} imageUrl - The full S3 URL
 * @returns {string|null} The S3 key or null if invalid URL
 */
const extractKeyFromUrl = (imageUrl) => {
  try {
    if (!imageUrl || typeof imageUrl !== "string") {
      return null;
    }

    // Handle different S3 URL formats
    // Format 1: https://bucket-name.s3.region.amazonaws.com/key
    // Format 2: https://s3.region.amazonaws.com/bucket-name/key

    const url = new URL(imageUrl);

    if (url.hostname.includes(".s3.") && url.hostname.startsWith(BUCKET_NAME)) {
      // Format 1: Extract key from pathname
      return url.pathname.substring(1); // Remove leading slash
    } else if (
      url.hostname.includes("s3.") &&
      url.pathname.startsWith(`/${BUCKET_NAME}/`)
    ) {
      // Format 2: Extract key after bucket name
      return url.pathname.substring(`/${BUCKET_NAME}/`.length);
    }

    return null;
  } catch (error) {
    console.error("Error extracting key from URL:", error);
    return null;
  }
};

/**
 * Get file extension based on content type or filename
 * @param {string} contentType - MIME type
 * @param {string} originalName - Original filename
 * @returns {string} File extension with dot
 */
const getFileExtension = (contentType, originalName) => {
  // First try to get extension from content type
  if (contentType) {
    switch (contentType.toLowerCase()) {
      case "image/jpeg":
      case "image/jpg":
        return ".jpg";
      case "image/png":
        return ".png";
      case "image/gif":
        return ".gif";
      case "image/webp":
        return ".webp";
      case "image/svg+xml":
        return ".svg";
      default:
        break;
    }
  }

  // Fallback to extracting from filename
  if (originalName && originalName.includes(".")) {
    const ext = originalName.substring(originalName.lastIndexOf("."));
    return ext.toLowerCase();
  }

  // Default to jpg
  return ".jpg";
};

/**
 * Validate image content type
 * @param {string} contentType - MIME type to validate
 * @returns {boolean} Whether the content type is a valid image type
 */
const isValidImageType = (contentType) => {
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];

  return validTypes.includes(contentType?.toLowerCase());
};

/**
 * Get bucket configuration info
 * @returns {Object} Bucket configuration
 */
const getBucketInfo = () => {
  return {
    bucketName: BUCKET_NAME,
    region: S3_REGION,
    baseUrl: `https://${BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com`,
  };
};

module.exports = {
  uploadImage,
  deleteImage,
  extractKeyFromUrl,
  isValidImageType,
  getBucketInfo,
};
