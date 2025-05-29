/**
 * test-image-upload.js
 * Test script for the image upload functionality
 * This script demonstrates how to upload an image using base64 encoding
 */

const fs = require("fs");
const path = require("path");

// Example function to convert a local image file to base64
function imageToBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64String = imageBuffer.toString("base64");

    // Get file extension to determine content type
    const ext = path.extname(imagePath).toLowerCase();
    let contentType = "image/jpeg"; // default

    switch (ext) {
      case ".png":
        contentType = "image/png";
        break;
      case ".gif":
        contentType = "image/gif";
        break;
      case ".webp":
        contentType = "image/webp";
        break;
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
    }

    return {
      base64: base64String,
      contentType: contentType,
      fileName: path.basename(imagePath),
    };
  } catch (error) {
    console.error("Error reading image file:", error);
    return null;
  }
}

// Example usage with a test image
async function testImageUpload() {
  // Replace with your actual API Gateway endpoint
  const API_BASE_URL =
    "https://your-api-id.execute-api.eu-west-3.amazonaws.com";

  // Example: upload a test image
  // You would replace this with an actual image file path
  const testImagePath = "./test-image.jpg";

  // Check if test image exists
  if (!fs.existsSync(testImagePath)) {
    console.log("📝 To test image upload:");
    console.log(
      '1. Place a test image named "test-image.jpg" in this directory'
    );
    console.log("2. Update the API_BASE_URL in this script");
    console.log("3. Run: node test-image-upload.js");
    console.log("\n📋 Example frontend code for image upload:\n");

    // Show example frontend code
    console.log(`
// Frontend JavaScript example for uploading images

// Method 1: Upload from file input
async function uploadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function(e) {
      const base64String = e.target.result;
      
      try {
        const response = await fetch('${API_BASE_URL}/products/images/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64String, // This includes the data:image/jpeg;base64, prefix
            fileName: file.name,
            contentType: file.type
          })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          console.log('Upload successful:', result);
          // result.image.url contains the public S3 URL
          resolve(result.image.url);
        } else {
          console.error('Upload failed:', result);
          reject(new Error(result.error || 'Upload failed'));
        }
      } catch (error) {
        console.error('Network error:', error);
        reject(error);
      }
    };
    reader.readAsDataURL(file);
  });
}

// Method 2: Upload from base64 string
async function uploadImageFromBase64(base64String, fileName = 'image.jpg', contentType = 'image/jpeg') {
  try {
    const response = await fetch('${API_BASE_URL}/products/images/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64String, // Just the base64 string without data URL prefix
        fileName: fileName,
        contentType: contentType
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('Upload successful:', result);
      return result.image.url;
    } else {
      console.error('Upload failed:', result);
      throw new Error(result.error || 'Upload failed');
    }
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
}

// Method 3: Delete an image
async function deleteImage(imageKey) {
  try {
    const response = await fetch(\`${API_BASE_URL}/products/images/\${encodeURIComponent(imageKey)}\`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('Delete successful:', result);
      return true;
    } else {
      console.error('Delete failed:', result);
      throw new Error(result.error || 'Delete failed');
    }
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
}

// Example usage in React component
function ProductImageUpload({ productId, onImageUploaded }) {
  const [uploading, setUploading] = useState(false);
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    
    setUploading(true);
    try {
      const imageUrl = await uploadImageFromFile(file);
      
      // Save to database
      await fetch(\`${API_BASE_URL}/products/\${productId}/images\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          alt_text: file.name,
          is_primary: false
        })
      });
      
      onImageUploaded(imageUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
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
`);
    return;
  }

  // Convert image to base64
  const imageData = imageToBase64(testImagePath);
  if (!imageData) {
    console.error("Failed to read test image");
    return;
  }

  console.log("🚀 Testing image upload...");
  console.log(`📄 File: ${imageData.fileName}`);
  console.log(`📊 Content Type: ${imageData.contentType}`);
  console.log(`📏 Base64 Size: ${imageData.base64.length} characters`);

  // Prepare request payload
  const payload = {
    image: imageData.base64,
    fileName: imageData.fileName,
    contentType: imageData.contentType,
  };

  try {
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/products/images/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Upload successful!");
      console.log("📷 Image URL:", result.image.url);
      console.log("🔑 S3 Key:", result.image.key);
      console.log("📦 Bucket:", result.image.bucket);

      // Test delete functionality
      console.log("\n🗑️ Testing delete functionality...");
      const deleteResponse = await fetch(
        `${API_BASE_URL}/products/images/${encodeURIComponent(
          result.image.key
        )}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const deleteResult = await deleteResponse.json();

      if (deleteResponse.ok) {
        console.log("✅ Delete successful!");
        console.log("📝 Message:", deleteResult.message);
      } else {
        console.log("❌ Delete failed:", deleteResult);
      }
    } else {
      console.log("❌ Upload failed:", result);
    }
  } catch (error) {
    console.error("🚫 Network error:", error);
  }
}

// Run the test
if (require.main === module) {
  testImageUpload();
}

module.exports = { imageToBase64, testImageUpload };
