/**
 * productImageService.js
 * This module contains functions for CRUD operations on the product_images table
 */

const { executeQuery } = require("./dbConnector");
const imageService = require("./imageService");

/**
 * Get all images for a specific product
 * @param {number} productId - The product ID
 * @returns {Promise<Array>} List of product images
 */
const getProductImages = async (productId) => {
  const query = `
    SELECT id, product_id, image_url, image_key, alt_text, display_order, is_primary, created_at, updated_at 
    FROM product_images 
    WHERE product_id = ? 
    ORDER BY display_order ASC
  `;
  return executeQuery(query, [productId]);
};

/**
 * Get a specific product image by its ID
 * @param {number} id - The image ID
 * @returns {Promise<Object>} The image data
 */
const getProductImageById = async (id) => {
  const query = `
    SELECT id, product_id, image_url, image_key, alt_text, display_order, is_primary, created_at, updated_at 
    FROM product_images 
    WHERE id = ?
  `;
  const result = await executeQuery(query, [id]);
  return result[0]; // Return the first (and should be only) result
};

/**
 * Get the primary image for a specific product
 * @param {number} productId - The product ID
 * @returns {Promise<Object>} The primary image data
 */
const getPrimaryProductImage = async (productId) => {
  const query = `
    SELECT id, product_id, image_url, image_key, alt_text, display_order, is_primary, created_at, updated_at 
    FROM product_images 
    WHERE product_id = ? AND is_primary = TRUE
  `;
  const result = await executeQuery(query, [productId]);
  return result[0]; // Return the first (and should be only) result
};

/**
 * Create a new product image record
 * @param {Object} imageData - The image data
 * @returns {Promise<Object>} Result of the insert operation
 */
const createProductImage = async (imageData) => {
  const query = `
    INSERT INTO product_images (product_id, image_url, image_key, alt_text, display_order, is_primary) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  // Default values
  const displayOrder = imageData.display_order || 0;
  const isPrimary = imageData.is_primary || false;

  const params = [
    imageData.product_id,
    imageData.image_url,
    imageData.image_key,
    imageData.alt_text || null,
    displayOrder,
    isPrimary,
  ];

  return executeQuery(query, params);
};

/**
 * Update an existing product image
 * @param {number} id - The image ID to update
 * @param {Object} imageData - The updated image data
 * @returns {Promise<Object>} Result of the update operation
 */
const updateProductImage = async (id, imageData) => {
  // Create dynamic query based on provided fields
  const updates = [];
  const params = [];

  if (imageData.alt_text !== undefined) {
    updates.push("alt_text = ?");
    params.push(imageData.alt_text);
  }

  if (imageData.display_order !== undefined) {
    updates.push("display_order = ?");
    params.push(imageData.display_order);
  }

  if (imageData.is_primary !== undefined) {
    updates.push("is_primary = ?");
    params.push(imageData.is_primary);
  }

  // Add the ID at the end of params
  params.push(id);

  // If no updates specified, return early
  if (updates.length === 0) {
    throw new Error("No fields to update were provided");
  }

  const query = `
    UPDATE product_images 
    SET ${updates.join(", ")} 
    WHERE id = ?
  `;

  return executeQuery(query, params);
};

/**
 * Set a product image as primary and unset any existing primary
 * @param {number} id - The image ID to set as primary
 * @param {number} productId - The product ID
 * @returns {Promise<Object>} Result of the update operation
 */
const setPrimaryProductImage = async (id, productId) => {
  // First unset current primary image
  const unsetQuery = `
    UPDATE product_images 
    SET is_primary = FALSE 
    WHERE product_id = ? AND is_primary = TRUE
  `;
  await executeQuery(unsetQuery, [productId]);

  // Then set new primary image
  const setQuery = `
    UPDATE product_images 
    SET is_primary = TRUE 
    WHERE id = ? AND product_id = ?
  `;
  return executeQuery(setQuery, [id, productId]);
};

/**
 * Delete a product image by its ID
 * Also deletes the image from S3 if deleteFromS3 is true
 * @param {number} id - The image ID to delete
 * @param {boolean} deleteFromS3 - Whether to also delete the image from S3
 * @returns {Promise<Object>} Result of the delete operation
 */
const deleteProductImage = async (id, deleteFromS3 = true) => {
  // First get the image record to get the S3 key
  const image = await getProductImageById(id);
  if (!image) {
    throw new Error(`Image with ID ${id} not found`);
  }

  // Delete from S3 if requested
  if (deleteFromS3 && image.image_key) {
    try {
      await imageService.deleteImage(image.image_key);
    } catch (error) {
      console.error(`Error deleting image from S3: ${error.message}`);
      // Continue with database deletion even if S3 deletion fails
    }
  }

  // Delete from database
  const query = `DELETE FROM product_images WHERE id = ?`;
  return executeQuery(query, [id]);
};

/**
 * Delete all images for a specific product
 * Also deletes the images from S3 if deleteFromS3 is true
 * @param {number} productId - The product ID
 * @param {boolean} deleteFromS3 - Whether to also delete images from S3
 * @returns {Promise<Object>} Result of the delete operation
 */
const deleteProductImages = async (productId, deleteFromS3 = true) => {
  // First get all images for the product
  const images = await getProductImages(productId);

  // Delete each image from S3 if requested
  if (deleteFromS3) {
    for (const image of images) {
      if (image.image_key) {
        try {
          await imageService.deleteImage(image.image_key);
        } catch (error) {
          console.error(`Error deleting image from S3: ${error.message}`);
          // Continue with other deletions even if this one fails
        }
      }
    }
  }

  // Delete all images from database
  const query = `DELETE FROM product_images WHERE product_id = ?`;
  return executeQuery(query, [productId]);
};

module.exports = {
  getProductImages,
  getProductImageById,
  getPrimaryProductImage,
  createProductImage,
  updateProductImage,
  setPrimaryProductImage,
  deleteProductImage,
  deleteProductImages,
};
