/**
 * Protected Handler - All Lambda functions with authentication
 * This file wraps existing handlers with Cognito authentication
 */

const {
  withAuth,
  withAdminAuth,
  withOptionalAuth,
} = require("./authMiddleware");

// Import original handlers
const originalHandler = require("./handler");

// ========== Public Endpoints (No Authentication Required) ==========

/**
 * Test database connection - Allow in dev for debugging
 */
exports.testDbConnection = withAuth(originalHandler.testDbConnection, {
  skipAuth: true,
});

// ========== Product Endpoints (Protected) ==========

/**
 * Get products - Read access for authenticated users
 */
exports.getProducts = withAuth(originalHandler.getProducts);

/**
 * Create product - Admin only
 */
exports.createProduct = withAdminAuth(originalHandler.createProduct);

/**
 * Update product - Admin only
 */
exports.updateProduct = withAdminAuth(originalHandler.updateProduct);

/**
 * Delete product - Admin only
 */
exports.deleteProduct = withAdminAuth(originalHandler.deleteProduct);

// ========== User Endpoints (Protected) ==========

/**
 * Get users - Admin only (contains sensitive user data)
 */
exports.getUsers = withAdminAuth(originalHandler.getUsers);

/**
 * Create user - Admin only
 */
exports.createUser = withAdminAuth(originalHandler.createUser);

/**
 * Update user - Admin only
 */
exports.updateUser = withAdminAuth(originalHandler.updateUser);

/**
 * Delete user - Admin only
 */
exports.deleteUser = withAdminAuth(originalHandler.deleteUser);

// ========== Order Endpoints (Protected) ==========

/**
 * Get orders - Admin can see all, regular users see their own
 */
exports.getOrders = withAuth(async (event) => {
  // If user is admin, return all orders
  if (event.user.isAdmin) {
    return await originalHandler.getOrders(event);
  }

  // For regular users, filter by their user ID
  const orderId = event.pathParameters?.id;

  if (orderId) {
    // Get specific order - check ownership
    const orderResult = await originalHandler.getOrders(event);

    // If order doesn't exist or doesn't belong to user, return 404
    if (orderResult.statusCode === 200) {
      const order = JSON.parse(orderResult.body);
      if (order.user_id !== event.user.userId) {
        return {
          statusCode: 404,
          headers: orderResult.headers,
          body: JSON.stringify({ error: "Order not found" }),
        };
      }
    }

    return orderResult;
  } else {
    // For listing orders, we need to modify the query to filter by user
    // This would require updating the orderService to accept user filtering
    // For now, return empty array for non-admin users
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify([]),
    };
  }
});

/**
 * Create order - Users can create orders for themselves
 */
exports.createOrder = withAuth(async (event) => {
  // Parse the request body to modify user_id
  const body = JSON.parse(event.body || "{}");

  // For non-admin users, force the user_id to be their own
  if (!event.user.isAdmin) {
    body.user_id = event.user.userId;
  }

  // Update the event body
  event.body = JSON.stringify(body);

  return await originalHandler.createOrder(event);
});

/**
 * Update order - Admin can update any, users can update their own
 */
exports.updateOrder = withAuth(async (event) => {
  if (event.user.isAdmin) {
    return await originalHandler.updateOrder(event);
  }

  // For regular users, check order ownership first
  const orderId = event.pathParameters?.id;
  if (!orderId) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ error: "Order ID is required" }),
    };
  }

  // Get the order to check ownership
  const getEvent = { ...event, body: null };
  const orderResult = await originalHandler.getOrders(getEvent);

  if (orderResult.statusCode === 200) {
    const order = JSON.parse(orderResult.body);
    if (order.user_id !== event.user.userId) {
      return {
        statusCode: 403,
        headers: orderResult.headers,
        body: JSON.stringify({ error: "Access denied" }),
      };
    }
  }

  return await originalHandler.updateOrder(event);
});

/**
 * Delete order - Admin only
 */
exports.deleteOrder = withAdminAuth(originalHandler.deleteOrder);

/**
 * Get total price - Admin only (business metrics)
 */
exports.getTotalPrice = withAdminAuth(originalHandler.getTotalPrice);

/**
 * Add order item - Users can add to their own orders
 */
exports.addOrderItem = withAuth(originalHandler.addOrderItem);

/**
 * Remove order item - Users can remove from their own orders
 */
exports.removeOrderItem = withAuth(originalHandler.removeOrderItem);

// ========== Product Image Endpoints (Protected) ==========

/**
 * Upload product image - Admin only
 */
exports.uploadProductImage = withAdminAuth(originalHandler.uploadProductImage);

/**
 * Delete product image - Admin only
 */
exports.deleteProductImage = withAdminAuth(originalHandler.deleteProductImage);

/**
 * Get product images - Allow authenticated users to view
 */
exports.getProductImages = withAuth(originalHandler.getProductImages);

/**
 * Create product image record - Admin only
 */
exports.createProductImageRecord = withAdminAuth(
  originalHandler.createProductImageRecord
);

/**
 * Update product image record - Admin only
 */
exports.updateProductImageRecord = withAdminAuth(
  originalHandler.updateProductImageRecord
);

/**
 * Set primary product image - Admin only
 */
exports.setPrimaryProductImage = withAdminAuth(
  originalHandler.setPrimaryProductImage
);

/**
 * Delete product image record - Admin only
 */
exports.deleteProductImageRecord = withAdminAuth(
  originalHandler.deleteProductImageRecord
);

/**
 * Delete all product images - Admin only
 */
exports.deleteProductImages = withAdminAuth(
  originalHandler.deleteProductImages
);
