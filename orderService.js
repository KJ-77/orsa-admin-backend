/**
 * orderService.js
 * This module contains functions for CRUD operations on the orders and order_items tables
 */

const { executeQuery, pool } = require("./dbConnector");

/**
 * Get all orders with basic information
 * @returns {Promise<Array>} List of orders
 */
const getAllOrders = async () => {
  const query = `
    SELECT o.*, u.first_name, u.last_name, u.email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `;
  return executeQuery(query);
};

/**
 * Get detailed information about a specific order including all its items
 * @param {number} id - The order ID
 * @returns {Promise<Object>} The order data with items
 */
const getOrderById = async (id) => {
  // First, get the order details
  const orderQuery = `
    SELECT o.*, u.first_name, u.last_name, u.email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `;
  const orders = await executeQuery(orderQuery, [id]);

  if (orders.length === 0) {
    return null;
  }

  const order = orders[0];

  // Then, get the order items
  const itemsQuery = `
    SELECT oi.*, p.name as product_name, p.description as product_description
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `;
  const items = await executeQuery(itemsQuery, [id]);

  // Combine the results
  order.items = items;
  return order;
};

/**
 * Create a new order with items
 * @param {Object} orderData - The order data including items
 * @returns {Promise<Object>} Result with the created order ID
 */
const createOrder = async (orderData) => {
  // Start a transaction to ensure all operations succeed or fail together
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Create the order
    const orderQuery = `
      INSERT INTO orders (user_id, user_name, user_location, order_status, total_price)
      VALUES (?, ?, ?, ?, ?)
    `;
    const orderParams = [
      orderData.user_id,
      orderData.user_name,
      orderData.user_location,
      orderData.order_status || "pending", // Default status
      orderData.total_price || 0, // Will be updated after adding items
    ];

    const orderResult = await connection.execute(orderQuery, orderParams);
    const orderId = orderResult[0].insertId;

    // 2. Create all order items
    let totalPrice = 0;
    if (orderData.items && orderData.items.length > 0) {
      const itemQuery = `
        INSERT INTO order_items 
          (order_id, product_id, product_name, quantity, unit_price, total_price) 
        VALUES 
          (?, ?, ?, ?, ?, ?)
      `;

      for (const item of orderData.items) {
        const itemTotal = item.quantity * item.unit_price;
        totalPrice += itemTotal;

        await connection.execute(itemQuery, [
          orderId,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price,
          itemTotal,
        ]);
      }
    }

    // 3. Update the order with the calculated total price
    if (totalPrice > 0 && !orderData.total_price) {
      await connection.execute(
        "UPDATE orders SET total_price = ? WHERE id = ?",
        [totalPrice, orderId]
      );
    }

    // Commit the transaction
    await connection.commit();

    return {
      id: orderId,
      message: "Order created successfully",
      total_price: totalPrice || orderData.total_price,
    };
  } catch (error) {
    // Rollback in case of error
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Update an existing order
 * @param {number} id - The order ID to update
 * @param {Object} orderData - The updated order data
 * @returns {Promise<Object>} Result of the update operation
 */
const updateOrder = async (id, orderData) => {
  // Create dynamic query based on provided fields
  const updates = [];
  const params = [];

  if (orderData.user_id !== undefined) {
    updates.push("user_id = ?");
    params.push(orderData.user_id);
  }

  if (orderData.user_name !== undefined) {
    updates.push("user_name = ?");
    params.push(orderData.user_name);
  }

  if (orderData.user_location !== undefined) {
    updates.push("user_location = ?");
    params.push(orderData.user_location);
  }

  if (orderData.order_status !== undefined) {
    updates.push("order_status = ?");
    params.push(orderData.order_status);
  }

  if (orderData.total_price !== undefined) {
    updates.push("total_price = ?");
    params.push(orderData.total_price);
  }

  // Add the ID at the end of params
  params.push(id);

  if (updates.length === 0) {
    return { message: "No updates provided" };
  }

  const query = `
    UPDATE orders 
    SET ${updates.join(", ")} 
    WHERE id = ?
  `;

  await executeQuery(query, params);
  return { message: "Order updated successfully" };
};

/**
 * Delete an order and its items
 * @param {number} id - The order ID to delete
 * @returns {Promise<Object>} Result of the delete operation
 */
const deleteOrder = async (id) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // First delete order items (due to foreign key constraint)
    await connection.execute("DELETE FROM order_items WHERE order_id = ?", [
      id,
    ]);

    // Then delete the order
    const result = await connection.execute("DELETE FROM orders WHERE id = ?", [
      id,
    ]);

    await connection.commit();

    return {
      message: "Order deleted successfully",
      affectedRows: result[0].affectedRows,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Add an item to an existing order
 * @param {number} orderId - The order ID
 * @param {Object} item - The item to add
 * @returns {Promise<Object>} Result of the operation
 */
const addOrderItem = async (orderId, item) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert the order item
    const itemQuery = `
      INSERT INTO order_items 
        (order_id, product_id, product_name, quantity, unit_price, total_price) 
      VALUES 
        (?, ?, ?, ?, ?, ?)
    `;

    const itemTotal = item.quantity * item.unit_price;

    await connection.execute(itemQuery, [
      orderId,
      item.product_id,
      item.product_name,
      item.quantity,
      item.unit_price,
      itemTotal,
    ]);

    // 2. Update the order's total price
    await connection.execute(
      "UPDATE orders SET total_price = total_price + ? WHERE id = ?",
      [itemTotal, orderId]
    );

    await connection.commit();

    return {
      message: "Item added to order successfully",
      item_total: itemTotal,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Remove an item from an order
 * @param {number} itemId - The order item ID to remove
 * @returns {Promise<Object>} Result of the operation
 */
const removeOrderItem = async (itemId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get the item information
    const [items] = await connection.execute(
      "SELECT order_id, total_price FROM order_items WHERE id = ?",
      [itemId]
    );

    if (items.length === 0) {
      throw new Error("Item not found");
    }

    const { order_id, total_price } = items[0];

    // 2. Delete the item
    await connection.execute("DELETE FROM order_items WHERE id = ?", [itemId]);

    // 3. Update the order total
    await connection.execute(
      "UPDATE orders SET total_price = total_price - ? WHERE id = ?",
      [total_price, order_id]
    );

    await connection.commit();

    return { message: "Item removed from order successfully" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getTotalPrice = async (dateRange = {}) => {
  const connection = await pool.getConnection();
  try {
    // Set default dates if not provided
    const fromDate = dateRange.from || '2020-01-01';
    const toDate = dateRange.to || new Date().toISOString().slice(0, 10); // Today's date in YYYY-MM-DD format
    
    const query = `
      SELECT SUM(total_price) AS total
      FROM orders
      WHERE created_at BETWEEN ? AND ?
    `;
    
    const [rows] = await connection.execute(query, [fromDate, toDate]);
    
    // First row, total column, or 0 if null
    return rows[0].total || 0;
  } catch (error) {
    console.error('Error getting total price:', error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  addOrderItem,
  removeOrderItem,
  getTotalPrice,
};
