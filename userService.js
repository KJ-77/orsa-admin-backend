/**
 * userService.js
 * This module contains functions for CRUD operations on the users table
 */

const { executeQuery } = require("./dbConnector");

/**
 * Get all users from the database
 * @returns {Promise<Array>} List of users (excluding sensitive information)
 */
const getAllUsers = async () => {
  // Excluding password field for security if it exists
  const query = `
    SELECT id, first_name, last_name, email, address, 
           birthdate, gender, phone_number 
    FROM users
  `;
  return executeQuery(query);
};

/**
 * Get a user by their ID
 * @param {number} id - The user ID
 * @returns {Promise<Object>} The user data (excluding sensitive information)
 */
const getUserById = async (id) => {
  const query = `
    SELECT id, first_name, last_name, email, address, 
           birthdate, gender, phone_number 
    FROM users 
    WHERE id = ?
  `;
  const result = await executeQuery(query, [id]);
  return result[0]; // Return the first (and should be only) result
};

/**
 * Create a new user
 * @param {Object} user - The user data
 * @returns {Promise<Object>} Result of the insert operation
 */
const createUser = async (user) => {
  const query = `
    INSERT INTO users (
      id, first_name, last_name, email, address, 
      birthdate, gender, phone_number
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    user.id,
    user.first_name,
    user.last_name,
    user.email,
    user.address,
    user.birthdate,
    user.gender,
    user.phone_number,
  ];

  return executeQuery(query, params);
};

/**
 * Update an existing user
 * @param {number} id - The user ID to update
 * @param {Object} user - The updated user data
 * @returns {Promise<Object>} Result of the update operation
 */
const updateUser = async (id, user) => {
  // Create dynamic query based on provided fields
  const updates = [];
  const params = [];

  if (user.first_name !== undefined) {
    updates.push("first_name = ?");
    params.push(user.first_name);
  }

  if (user.last_name !== undefined) {
    updates.push("last_name = ?");
    params.push(user.last_name);
  }

  if (user.email !== undefined) {
    updates.push("email = ?");
    params.push(user.email);
  }

  if (user.address !== undefined) {
    updates.push("address = ?");
    params.push(user.address);
  }

  if (user.birthdate !== undefined) {
    updates.push("birthdate = ?");
    params.push(user.birthdate);
  }

  if (user.gender !== undefined) {
    updates.push("gender = ?");
    params.push(user.gender);
  }

  if (user.phone_number !== undefined) {
    updates.push("phone_number = ?");
    params.push(user.phone_number);
  }

  // Add the ID at the end of params
  params.push(id);

  const query = `
    UPDATE users 
    SET ${updates.join(", ")} 
    WHERE id = ?
  `;

  return executeQuery(query, params);
};

/**
 * Delete a user by their ID
 * @param {number} id - The user ID to delete
 * @returns {Promise<Object>} Result of the delete operation
 */
const deleteUser = async (id) => {
  const query = `DELETE FROM users WHERE id = ?`;
  return executeQuery(query, [id]);
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
