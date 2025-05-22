/**
 * Main handler file for Orsa E-commerce API
 * Contains all Lambda function handlers for CRUD operations on the database
 */

// Import service modules
const productService = require("./productService");
const userService = require("./userService");
const orderService = require("./orderService");

/**
 * Helper function to create a standardized API response
 * @param {number} statusCode - HTTP status code
 * @param {Object|string} data - Response data or error message
 * @returns {Object} Formatted API Gateway response
 */
const createResponse = (statusCode, data) => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Enable CORS for browser access
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify(data),
  };
};

/**
 * Generic error handler for API requests
 * @param {Error} error - The error object
 * @returns {Object} Error response
 */
const handleError = (error) => {
  console.error("Error:", error);

  // Log more details about the environment for debugging
  console.error("Environment:", {
    NODE_ENV: process.env.NODE_ENV,
    AWS_REGION: process.env.AWS_REGION,
    DB_HOST_DEFINED: !!process.env.DB_HOST,
    DB_USER_DEFINED: !!process.env.DB_USER,
    DB_NAME_DEFINED: !!process.env.DB_NAME,
  });

  if (error.code === "ER_NO_SUCH_TABLE") {
    return createResponse(500, {
      error: "Database table does not exist",
      message: error.message,
    });
  } else if (error.code === "ER_BAD_FIELD_ERROR") {
    return createResponse(400, {
      error: "Invalid field in request",
      message: error.message,
    });
  } else if (error.code === "ER_DUP_ENTRY") {
    return createResponse(409, {
      error: "Duplicate entry",
      message: error.message,
    });
  } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
    return createResponse(500, {
      error: "Database connection failed",
      message:
        "Unable to connect to database. Please check connection settings and network.",
      details: error.message,
    });
  } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
    return createResponse(500, {
      error: "Database access denied",
      message:
        "Invalid database credentials. Please check your username and password.",
      details: error.message,
    });
  } else {
    return createResponse(500, {
      error: "Internal server error",
      message: error.message || "An unexpected error occurred",
    });
  }
};

/**
 * Parse the request body safely
 * @param {string} body - The request body as a string
 * @returns {Object} Parsed body or empty object
 */
const parseBody = (body) => {
  try {
    return body ? JSON.parse(body) : {};
  } catch (error) {
    console.error("Error parsing request body:", error);
    return {};
  }
};

/**
 * Extract path parameters safely
 * @param {Object} event - API Gateway event
 * @param {string} paramName - The parameter name to extract
 * @returns {string|null} The parameter value or null
 */
const getPathParameter = (event, paramName) => {
  return event.pathParameters && event.pathParameters[paramName];
};

// ========== Product Handlers ==========

/**
 * Get all products or a single product by ID
 */
exports.getProducts = async (event) => {
  try {
    const productId = getPathParameter(event, "id");

    if (productId) {
      // Get a specific product
      const product = await productService.getProductById(productId);

      if (!product) {
        return createResponse(404, { error: "Product not found" });
      }

      return createResponse(200, product);
    } else {
      // Get all products
      const products = await productService.getAllProducts();
      return createResponse(200, products);
    }
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Create a new product
 */
exports.createProduct = async (event) => {
  try {
    const productData = parseBody(event.body);

    if (!productData.name || !productData.price) {
      return createResponse(400, {
        error: "Product name and price are required",
      });
    }

    const result = await productService.createProduct(productData);

    return createResponse(201, {
      message: "Product created successfully",
      productId: result.insertId,
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Update an existing product
 */
exports.updateProduct = async (event) => {
  try {
    const productId = getPathParameter(event, "id");
    const productData = parseBody(event.body);

    if (!productId) {
      return createResponse(400, { error: "Product ID is required" });
    }

    // Check if product exists
    const product = await productService.getProductById(productId);
    if (!product) {
      return createResponse(404, { error: "Product not found" });
    }

    await productService.updateProduct(productId, productData);

    return createResponse(200, {
      message: "Product updated successfully",
      productId,
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Delete a product
 */
exports.deleteProduct = async (event) => {
  try {
    const productId = getPathParameter(event, "id");

    if (!productId) {
      return createResponse(400, { error: "Product ID is required" });
    }

    // Check if product exists
    const product = await productService.getProductById(productId);
    if (!product) {
      return createResponse(404, { error: "Product not found" });
    }

    await productService.deleteProduct(productId);

    return createResponse(200, {
      message: "Product deleted successfully",
    });
  } catch (error) {
    return handleError(error);
  }
};

// ========== User Handlers ==========

/**
 * Get all users or a single user by ID
 */
exports.getUsers = async (event) => {
  try {
    const userId = getPathParameter(event, "id");

    if (userId) {
      // Get a specific user
      const user = await userService.getUserById(userId);

      if (!user) {
        return createResponse(404, { error: "User not found" });
      }

      return createResponse(200, user);
    } else {
      // Get all users
      const users = await userService.getAllUsers();
      return createResponse(200, users);
    }
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Create a new user
 */
exports.createUser = async (event) => {
  try {
    const userData = parseBody(event.body);

    if (!userData.first_name || !userData.last_name || !userData.email) {
      return createResponse(400, {
        error: "First name, last name, and email are required",
      });
    }

    const result = await userService.createUser(userData);

    return createResponse(201, {
      message: "User created successfully",
      userId: result.insertId,
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Update an existing user
 */
exports.updateUser = async (event) => {
  try {
    const userId = getPathParameter(event, "id");
    const userData = parseBody(event.body);

    if (!userId) {
      return createResponse(400, { error: "User ID is required" });
    }

    // Check if user exists
    const user = await userService.getUserById(userId);
    if (!user) {
      return createResponse(404, { error: "User not found" });
    }

    await userService.updateUser(userId, userData);

    return createResponse(200, {
      message: "User updated successfully",
      userId,
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Delete a user
 */
exports.deleteUser = async (event) => {
  try {
    const userId = getPathParameter(event, "id");

    if (!userId) {
      return createResponse(400, { error: "User ID is required" });
    }

    // Check if user exists
    const user = await userService.getUserById(userId);
    if (!user) {
      return createResponse(404, { error: "User not found" });
    }

    await userService.deleteUser(userId);

    return createResponse(200, {
      message: "User deleted successfully",
    });
  } catch (error) {
    return handleError(error);
  }
};

// ========== Order Handlers ==========

/**
 * Get all orders or a single order by ID
 */
exports.getOrders = async (event) => {
  try {
    const orderId = getPathParameter(event, "id");

    if (orderId) {
      // Get a specific order with items
      const order = await orderService.getOrderById(orderId);

      if (!order) {
        return createResponse(404, { error: "Order not found" });
      }

      return createResponse(200, order);
    } else {
      // Get all orders (basic info only)
      const orders = await orderService.getAllOrders();
      return createResponse(200, orders);
    }
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Create a new order with items
 */
exports.createOrder = async (event) => {
  try {
    const orderData = parseBody(event.body);

    if (!orderData.user_id) {
      return createResponse(400, { error: "User ID is required" });
    }

    const result = await orderService.createOrder(orderData);

    return createResponse(201, {
      message: "Order created successfully",
      orderId: result.id,
      totalPrice: result.total_price,
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Update an existing order
 */
exports.updateOrder = async (event) => {
  try {
    const orderId = getPathParameter(event, "id");
    const orderData = parseBody(event.body);

    if (!orderId) {
      return createResponse(400, { error: "Order ID is required" });
    }

    // Check if order exists
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return createResponse(404, { error: "Order not found" });
    }

    const result = await orderService.updateOrder(orderId, orderData);

    return createResponse(200, {
      message: result.message || "Order updated successfully",
      orderId,
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Delete an order and its items
 */
exports.deleteOrder = async (event) => {
  try {
    const orderId = getPathParameter(event, "id");

    if (!orderId) {
      return createResponse(400, { error: "Order ID is required" });
    }

    // Check if order exists
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return createResponse(404, { error: "Order not found" });
    }

    await orderService.deleteOrder(orderId);

    return createResponse(200, {
      message: "Order deleted successfully",
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Add a new item to an existing order
 */
exports.addOrderItem = async (event) => {
  try {
    const orderId = getPathParameter(event, "id");
    const itemData = parseBody(event.body);

    if (!orderId) {
      return createResponse(400, { error: "Order ID is required" });
    }

    if (!itemData.product_id || !itemData.quantity || !itemData.unit_price) {
      return createResponse(400, {
        error: "Product ID, quantity, and unit price are required",
      });
    }

    // Check if order exists
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return createResponse(404, { error: "Order not found" });
    }

    const result = await orderService.addOrderItem(orderId, itemData);

    return createResponse(201, {
      message: "Item added to order successfully",
      itemTotal: result.item_total,
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Remove an item from an order
 */
exports.removeOrderItem = async (event) => {
  try {
    const itemId = getPathParameter(event, "itemId");

    if (!itemId) {
      return createResponse(400, { error: "Item ID is required" });
    }

    await orderService.removeOrderItem(itemId);

    return createResponse(200, {
      message: "Item removed from order successfully",
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Test database connection and troubleshoot issues
 * This function performs comprehensive diagnostics of:
 * - VPC configuration
 * - Security groups
 * - Database connectivity
 * - Environment variables
 */
exports.testDbConnection = async (event) => {
  const mysql = require("mysql2/promise");
  const config = require("./config");
  const { networkInterfaces } = require("os");
  const dns = require("dns").promises;
  const net = require("net");

  const results = {
    environment: {},
    network: {},
    database: {},
    diagnostics: [],
    testTime: new Date().toISOString(),
    lambdaContext: true,
  };

  try {
    // 1. Check environment variables
    results.environment = {
      dbHost: config.db.host,
      dbUser: config.db.user,
      dbName: config.db.database,
      dbPort: config.db.port,
      nodeEnv: process.env.NODE_ENV,
      hasDbPassword: !!config.db.password,
      awsRegion: process.env.AWS_REGION,
      lambdaFunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
      lambdaFunctionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
    };

    results.diagnostics.push("✅ Environment variables collected");

    // 2. Check network interface (to verify Lambda is in VPC)
    try {
      const nets = networkInterfaces();
      results.network.interfaces = Object.keys(nets).map((name) => ({
        name,
        addresses: nets[name].map((net) => ({
          family: net.family,
          address: net.address,
        })),
      }));
      results.diagnostics.push("✅ Network interfaces detected");
    } catch (err) {
      results.diagnostics.push(
        `❌ Error getting network interfaces: ${err.message}`
      );
    }

    // 3. Try DNS lookup of database host
    try {
      const dnsResult = await dns.lookup(config.db.host);
      results.network.dnsLookup = dnsResult;
      results.diagnostics.push(
        `✅ DNS lookup successful: ${config.db.host} -> ${dnsResult.address}`
      );

      // 3.5 Try TCP connection to the database port
      try {
        const tcpTest = await new Promise((resolve, reject) => {
          const socket = net.createConnection(
            config.db.port,
            dnsResult.address
          );
          let success = false;

          socket.setTimeout(5000); // 5 second timeout

          socket.on("connect", () => {
            results.diagnostics.push(
              `✅ TCP connection successful to ${dnsResult.address}:${config.db.port}`
            );
            success = true;
            socket.end();
          });

          socket.on("timeout", () => {
            results.diagnostics.push(
              `❌ TCP connection timed out to ${dnsResult.address}:${config.db.port}`
            );
            socket.destroy();
          });

          socket.on("error", (err) => {
            results.diagnostics.push(`❌ TCP connection error: ${err.message}`);
          });

          socket.on("close", () => {
            resolve(success);
          });
        });

        results.network.tcpConnectionSuccess = tcpTest;
      } catch (tcpErr) {
        results.diagnostics.push(
          `❌ TCP connection test failed: ${tcpErr.message}`
        );
      }
    } catch (err) {
      results.diagnostics.push(
        `❌ DNS lookup failed for ${config.db.host}: ${err.message}`
      );
    }

    // 4. Try to connect to database
    try {
      const connection = await mysql.createConnection({
        host: config.db.host,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        port: config.db.port,
        connectTimeout: 10000, // 10s timeout
      });

      // Test query
      const [rows] = await connection.execute("SELECT 1 AS connection_test");
      results.database.connectionTest = rows[0];
      results.diagnostics.push("✅ Database connection successful");

      // Get server info
      const [serverInfo] = await connection.execute(
        "SELECT VERSION() as version"
      );
      results.database.serverInfo = serverInfo[0];
      results.diagnostics.push(`✅ MySQL version: ${serverInfo[0].version}`);

      // Check database existence
      const [databases] = await connection.execute("SHOW DATABASES");
      results.database.availableDatabases = databases.map((db) => db.Database);
      results.diagnostics.push(`✅ Found ${databases.length} databases`);

      // Check tables
      const [tables] = await connection.execute("SHOW TABLES");
      const tableField = Object.keys(tables[0])[0];
      results.database.tables = tables.map((table) => table[tableField]);
      results.diagnostics.push(`✅ Found ${tables.length} tables`);

      await connection.end();
    } catch (err) {
      results.database.error = {
        code: err.code,
        errno: err.errno,
        sqlState: err.sqlState,
        message: err.message,
      };
      results.diagnostics.push(`❌ Database connection failed: ${err.message}`);
    }

    return createResponse(200, results);
  } catch (error) {
    return createResponse(500, {
      error: "Test connection failed",
      message: error.message,
      stack: error.stack,
    });
  }
};
