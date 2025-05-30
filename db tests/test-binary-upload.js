// test-binary-upload.js
// Test script for binary image uploads

const fs = require("fs");
const path = require("path");

/**
 * Test binary image upload functionality
 * This script demonstrates how to upload images using binary data
 */

// Example test with a sample image file
async function testBinaryUpload() {
  try {
    // You'll need to have a test image file for this
    const imagePath = path.join(__dirname, "test-image.jpg"); // Create this file or change path

    if (!fs.existsSync(imagePath)) {
      console.log(
        "❌ Test image not found. Please add a test-image.jpg file to test binary uploads."
      );
      console.log(
        "📝 You can use any JPEG image and rename it to test-image.jpg"
      );
      return;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const fileName = path.basename(imagePath);

    // Your API endpoint (update with your actual endpoint)
    const apiEndpoint =
      "https://your-api-id.execute-api.eu-west-3.amazonaws.com/products/images/upload";

    console.log("🚀 Testing binary image upload...");
    console.log(`📁 File: ${fileName}`);
    console.log(`📏 Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "image/jpeg",
        "X-Filename": fileName,
        // Add any authentication headers if needed
        // 'Authorization': 'Bearer your-token'
      },
      body: imageBuffer,
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Upload successful!");
      console.log("📤 Response:", JSON.stringify(result, null, 2));
    } else {
      console.log("❌ Upload failed!");
      console.log("📤 Error:", JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

/**
 * Example of how to use fetch with binary data in a frontend application
 */
function frontendBinaryUploadExample() {
  const exampleCode = `
// Frontend JavaScript example for binary image upload

// Method 1: Using File input
function uploadImageFromFileInput(fileInput, apiEndpoint) {
  const file = fileInput.files[0];
  if (!file) return;
  
  return fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': file.type,
      'X-Filename': file.name,
      // Add authentication if needed
      // 'Authorization': 'Bearer ' + token
    },
    body: file
  });
}

// Method 2: Using drag and drop
function uploadImageFromDrop(file, apiEndpoint) {
  return fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': file.type,
      'X-Filename': file.name,
    },
    body: file
  });
}

// Method 3: Using ArrayBuffer
async function uploadImageFromArrayBuffer(arrayBuffer, contentType, fileName, apiEndpoint) {
  return fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'X-Filename': fileName,
    },
    body: arrayBuffer
  });
}

// React example with file input
function ImageUploadComponent() {
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const response = await fetch('/api/products/images/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-Filename': file.name,
        },
        body: file
      });
      
      const result = await response.json();
      console.log('Upload result:', result);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };
  
  return (
    <input 
      type="file" 
      accept="image/*" 
      onChange={handleFileUpload} 
    />
  );
}
  `;

  console.log("📋 Frontend Binary Upload Examples:");
  console.log(exampleCode);
}

/**
 * Insomnia/Postman test instructions
 */
function testingInstructions() {
  console.log(`
🧪 TESTING BINARY UPLOADS IN INSOMNIA/POSTMAN:

1. Create a new POST request
2. Set URL to: https://your-api-id.execute-api.eu-west-3.amazonaws.com/products/images/upload
3. Set Headers:
   - Content-Type: image/jpeg (or image/png, image/gif, etc.)
   - X-Filename: your-image-name.jpg (optional, for custom filename)
4. Body: Select "Binary file" and choose your image file
5. Send the request

📋 CURL EXAMPLE:
curl -X POST \\
  -H "Content-Type: image/jpeg" \\
  -H "X-Filename: test-image.jpg" \\
  --data-binary @/path/to/your/image.jpg \\
  https://your-api-id.execute-api.eu-west-3.amazonaws.com/products/images/upload

🔄 BACKWARD COMPATIBILITY:
The API still supports Base64 uploads via JSON payload:
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
  "fileName": "test-image.jpg",
  "contentType": "image/jpeg"
}
  `);
}

// Run examples
console.log("🎯 Binary Image Upload Test & Examples\n");

// Show testing instructions
testingInstructions();

// Show frontend examples
frontendBinaryUploadExample();

// Uncomment to run actual test (requires test image file)
// testBinaryUpload();

module.exports = {
  testBinaryUpload,
  frontendBinaryUploadExample,
  testingInstructions,
};
