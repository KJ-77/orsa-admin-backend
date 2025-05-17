/**
 * productService.js
 * This module contains functions for CRUD operations on the products table
 */

const { executeQuery } = require("./dbConnector");

/**
 * Get all products from the database
 * @returns {Promise<Array>} List of products
 */
const getAllProducts = async () => {
  const query = `SELECT * FROM products`;
  return executeQuery(query);
};

/**
 * Get a product by its ID
 * @param {number} id - The product ID
 * @returns {Promise<Object>} The product data
 */
const getProductById = async (id) => {
  const query = `SELECT * FROM products WHERE id = ?`;
  const result = await executeQuery(query, [id]);
  return result[0]; // Return the first (and should be only) result
};

/**
 * Create a new product
 * @param {Object} product - The product data
 * @returns {Promise<Object>} Result of the insert operation
 */
const createProduct = async (product) => {
  const query = `
    INSERT INTO products (name, price, quantity, description) 
    VALUES (?, ?, ?, ?)
  `;
  const params = [
    product.name,
    product.price,
    product.quantity,
    product.description,
  ];

  return executeQuery(query, params);
};

/**
 * Update an existing product
 * @param {number} id - The product ID to update
 * @param {Object} product - The updated product data
 * @returns {Promise<Object>} Result of the update operation
 */
const updateProduct = async (id, product) => {
  // Create dynamic query based on provided fields
  const updates = [];
  const params = [];

  if (product.name !== undefined) {
    updates.push("name = ?");
    params.push(product.name);
  }

  if (product.price !== undefined) {
    updates.push("price = ?");
    params.push(product.price);
  }

  if (product.quantity !== undefined) {
    updates.push("quantity = ?");
    params.push(product.quantity);
  }

  if (product.description !== undefined) {
    updates.push("description = ?");
    params.push(product.description);
  }

  // Add the ID at the end of params
  params.push(id);

  const query = `
    UPDATE products 
    SET ${updates.join(", ")} 
    WHERE id = ?
  `;

  return executeQuery(query, params);
};

/**
 * Delete a product by its ID
 * @param {number} id - The product ID to delete
 * @returns {Promise<Object>} Result of the delete operation
 */
const deleteProduct = async (id) => {
  const query = `DELETE FROM products WHERE id = ?`;
  return executeQuery(query, [id]);
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
