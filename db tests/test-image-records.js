/**
 * test-image-records.js
 * Test script for product image record CRUD operations
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Update this to your API URL
const API_URL = "http://localhost:3000"; // Change to your deployed API or local serverless-offline URL

// Sample product ID to use for testing (should exist in your database)
const PRODUCT_ID = 1; // Update this with a valid product ID from your database

// Test data for creating a product image record
const testImageData = {
  product_id: PRODUCT_ID,
  image_url:
    "https://orsa-admin-backend-product-images-dev.s3.eu-west-3.amazonaws.com/products/test-image.jpg",
  image_key: "products/test-image.jpg",
  alt_text: "Test product image",
  display_order: 1,
  is_primary: false,
};

/**
 * Run tests for product image record APIs
 */
const runTests = async () => {
  let createdImageId = null;

  try {
    console.log("===== Testing Product Image Record APIs =====");

    // 1. Create a new product image record
    console.log("\n--- Test 1: Create Product Image Record ---");
    try {
      const createResponse = await axios.post(
        `${API_URL}/products/images/record`,
        testImageData
      );
      console.log("✅ Success:", createResponse.data);

      // Save the created image ID for later tests
      createdImageId = createResponse.data.imageId;
      console.log(`Image ID created: ${createdImageId}`);
    } catch (error) {
      console.error("❌ Error:", error.response?.data || error.message);
    }

    // 2. Get all images for the product
    console.log("\n--- Test 2: Get Product Images ---");
    try {
      const getResponse = await axios.get(
        `${API_URL}/products/${PRODUCT_ID}/images`
      );
      console.log("✅ Success:", getResponse.data);
    } catch (error) {
      console.error("❌ Error:", error.response?.data || error.message);
    }

    // 3. Get a specific image by ID
    if (createdImageId) {
      console.log("\n--- Test 3: Get Product Image by ID ---");
      try {
        const getByIdResponse = await axios.get(
          `${API_URL}/products/images/${createdImageId}`
        );
        console.log("✅ Success:", getByIdResponse.data);
      } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
      }
    }

    // 4. Update an image record
    if (createdImageId) {
      console.log("\n--- Test 4: Update Product Image Record ---");
      try {
        const updateResponse = await axios.put(
          `${API_URL}/products/images/record/${createdImageId}`,
          {
            alt_text: "Updated alt text",
            display_order: 2,
          }
        );
        console.log("✅ Success:", updateResponse.data);
      } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
      }
    }

    // 5. Set as primary image
    if (createdImageId) {
      console.log("\n--- Test 5: Set Primary Product Image ---");
      try {
        const setPrimaryResponse = await axios.put(
          `${API_URL}/products/${PRODUCT_ID}/images/${createdImageId}/primary`
        );
        console.log("✅ Success:", setPrimaryResponse.data);
      } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
      }
    }

    // 6. Get primary image
    console.log("\n--- Test 6: Get Primary Product Image ---");
    try {
      const getPrimaryResponse = await axios.get(
        `${API_URL}/products/${PRODUCT_ID}/images?primaryOnly=true`
      );
      console.log("✅ Success:", getPrimaryResponse.data);
    } catch (error) {
      console.error("❌ Error:", error.response?.data || error.message);
    }

    // 7. Delete the image record
    if (createdImageId) {
      console.log(
        "\n--- Test 7: Delete Product Image Record (without deleting from S3) ---"
      );
      try {
        const deleteResponse = await axios.delete(
          `${API_URL}/products/images/record/${createdImageId}?deleteFromS3=false`
        );
        console.log("✅ Success:", deleteResponse.data);
      } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
      }
    }

    // 8. Create multiple test images for deletion test
    console.log("\n--- Test 8: Create Multiple Test Images ---");
    const testImages = [];
    for (let i = 0; i < 3; i++) {
      try {
        const createResponse = await axios.post(
          `${API_URL}/products/images/record`,
          {
            ...testImageData,
            alt_text: `Test image ${i + 1}`,
            display_order: i + 1,
          }
        );
        console.log(`✅ Created image ${i + 1}:`, createResponse.data.imageId);
        testImages.push(createResponse.data.imageId);
      } catch (error) {
        console.error(
          `❌ Error creating image ${i + 1}:`,
          error.response?.data || error.message
        );
      }
    }

    // 9. Delete all images for a product
    console.log("\n--- Test 9: Delete All Product Images ---");
    try {
      const deleteAllResponse = await axios.delete(
        `${API_URL}/products/${PRODUCT_ID}/images?deleteFromS3=false`
      );
      console.log("✅ Success:", deleteAllResponse.data);
    } catch (error) {
      console.error("❌ Error:", error.response?.data || error.message);
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
};

// Run the tests
runTests();
