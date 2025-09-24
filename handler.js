/**
 * Main handler file for Orsa E-commerce API
 * Contains all Lambda function handlers for CRUD operations on the database
 */

// Import service modules
const productService = require("./productService");
const userService = require("./userService");
const orderService = require("./orderService");
const imageService = require("./imageService");
const productImageService = require("./productImageService");
const stripeService = require("./stripeService");

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
 * Parse request body from event
 * @param {string} body - The request body as a string
 * @returns {Object} Parsed body as an object
 */
const parseBody = (body) => {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`Invalid request body: ${error.message}`);
  }
};

/**
 * Get path parameter from event
 * @param {Object} event - The Lambda event object
 * @param {string} param - The name of the path parameter
 * @returns {string|null} The path parameter value or null if not found
 */
const getPathParameter = (event, param) => {
  if (!event.pathParameters) {
    return null;
  }

  return event.pathParameters[param];
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

  // Handle specific database errors
  if (error.code === "ER_DUP_ENTRY") {
    return createResponse(409, {
      error: "Duplicate entry",
      message: "A record with this data already exists",
    });
  }

  // Handle foreign key constraint errors
  if (error.code === "ER_NO_REFERENCED_ROW") {
    return createResponse(400, {
      error: "Invalid reference",
      message: "Referenced record does not exist",
    });
  }

  // Handle other specific errors as needed

  // Default error response
  return createResponse(500, {
    error: "Server error",
    message: error.message,
  });
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

    // First delete all product images (including from S3)
    // This ensures S3 cleanup before database cascade deletion
    try {
      await productImageService.deleteProductImages(productId, true);
      console.log(`Cleaned up images for product ${productId}`);
    } catch (imageError) {
      console.error(
        `Error cleaning up images for product ${productId}:`,
        imageError
      );
      // Continue with product deletion even if image cleanup fails
      // The database cascade will still clean up the database records
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
      stripeId: result.stripe_id,
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
 * Get total price within a month
 */
exports.getTotalPrice = async (event) => {
  try {
    // Parse query parameters from the GET request
    const queryParams = event.queryStringParameters || {};

    // Create date range object using query parameters
    const dateRange = {
      from: queryParams.from,
      to: queryParams.to,
    };

    // No validation needed - our service function handles missing dates

    const totalPrice = await orderService.getTotalPrice(dateRange);

    return createResponse(200, {
      totalPrice,
      dateRange: {
        from: dateRange.from || "all time start",
        to: dateRange.to || "today",
      },
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

// ========== Product Image Handlers ==========

/**
 * Upload a product image to S3
 * Supports both Base64 encoded data and direct binary uploads
 */
exports.uploadProductImage = async (event) => {
  try {
    console.log("Starting image upload process...");
    console.log("Event headers:", event.headers);
    console.log("Event isBase64Encoded:", event.isBase64Encoded);
    console.log("Body type:", typeof event.body);

    let imageBuffer;
    let contentType;
    let originalName = "uploaded-image";

    // Check if this is a binary upload
    const isBinary =
      event.isBase64Encoded ||
      (event.headers &&
        (event.headers["content-type"]?.startsWith("image/") ||
          event.headers["Content-Type"]?.startsWith("image/")));

    if (isBinary) {
      // Handle binary upload
      console.log("Processing binary image upload...");

      // Get content type from headers
      contentType =
        event.headers["content-type"] ||
        event.headers["Content-Type"] ||
        "image/jpeg";

      // Get filename from X-Filename header if provided
      originalName =
        event.headers["x-filename"] ||
        event.headers["X-Filename"] ||
        event.headers["x-file-name"] ||
        event.headers["X-File-Name"] ||
        `image-${Date.now()}.${contentType.split("/")[1] || "jpg"}`;

      if (event.isBase64Encoded) {
        // Body is base64 encoded binary data
        try {
          imageBuffer = Buffer.from(event.body, "base64");
        } catch (error) {
          return createResponse(400, {
            error: "Invalid binary data",
            message: "Could not decode the provided binary image data",
          });
        }
      } else {
        // Body should be binary string
        imageBuffer = Buffer.from(event.body, "binary");
      }

      console.log(
        `Binary upload - Content-Type: ${contentType}, Filename: ${originalName}, Size: ${imageBuffer.length} bytes`
      );
    } else {
      // Handle JSON payload with Base64 data (legacy support)
      console.log("Processing JSON with Base64 image upload...");

      const body = parseBody(event.body);

      // Validate required fields
      if (!body.image) {
        return createResponse(400, {
          error: "Image data is required",
          message:
            "Please provide image data in base64 format or as binary data",
        });
      }

      contentType = body.contentType || "image/jpeg";
      originalName = body.fileName || "uploaded-image";

      if (typeof body.image === "string") {
        // Handle Base64 data
        let base64Data = body.image;

        // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
        if (base64Data.startsWith("data:")) {
          const base64Index = base64Data.indexOf(",");
          if (base64Index !== -1) {
            // Extract content type from data URL
            const dataUrlPrefix = base64Data.substring(0, base64Index);
            const contentTypeMatch = dataUrlPrefix.match(/data:([^;]+)/);
            if (contentTypeMatch) {
              contentType = contentTypeMatch[1];
            }
            base64Data = base64Data.substring(base64Index + 1);
          }
        }

        // Convert base64 to buffer
        try {
          imageBuffer = Buffer.from(base64Data, "base64");
        } catch (error) {
          return createResponse(400, {
            error: "Invalid base64 image data",
            message: "Could not decode the provided base64 image data",
          });
        }
      } else {
        return createResponse(400, {
          error: "Unsupported image format",
          message: "Please provide image as base64 encoded string",
        });
      }
    }

    // Validate image type
    if (!imageService.isValidImageType(contentType)) {
      return createResponse(400, {
        error: "Invalid image type",
        message: "Supported formats: JPEG, PNG, GIF, WebP, SVG",
        providedType: contentType,
      });
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (imageBuffer.length > maxSize) {
      return createResponse(400, {
        error: "File too large",
        message: `Maximum file size is ${maxSize / (1024 * 1024)}MB`,
        fileSize: `${(imageBuffer.length / (1024 * 1024)).toFixed(2)}MB`,
      });
    }

    console.log(
      `Uploading image: ${originalName}, type: ${contentType}, size: ${imageBuffer.length} bytes`
    );

    // Upload to S3
    const uploadResult = await imageService.uploadImage(
      imageBuffer,
      contentType,
      originalName
    );

    console.log("Image uploaded successfully:", uploadResult);

    return createResponse(201, {
      message: "Image uploaded successfully",
      image: {
        key: uploadResult.key,
        url: uploadResult.url,
        bucket: uploadResult.bucket,
        contentType: contentType,
        size: imageBuffer.length,
        fileName: originalName,
      },
    });
  } catch (error) {
    console.error("Error uploading product image:", error);
    return handleError(error);
  }
};

/**
 * Delete a product image from S3
 */
exports.deleteProductImage = async (event) => {
  try {
    const imageKey = getPathParameter(event, "imageKey");

    if (!imageKey) {
      return createResponse(400, {
        error: "Image key is required",
        message: "Please provide the S3 key of the image to delete",
      });
    }

    console.log(`Deleting image with key: ${imageKey}`);

    // Delete from S3
    const deleteResult = await imageService.deleteImage(imageKey);

    console.log("Image deleted successfully:", deleteResult);

    return createResponse(200, {
      message: "Image deleted successfully",
      key: imageKey,
    });
  } catch (error) {
    console.error("Error deleting product image:", error);

    // Handle specific S3 errors
    if (error.name === "NoSuchKey") {
      return createResponse(404, {
        error: "Image not found",
        message: "The specified image does not exist",
      });
    }

    return handleError(error);
  }
};

// ========== Product Image Info Handlers ==========

/**
 * Get all images for a product or a specific image by ID
 * If imageId is provided, returns that specific image
 * Otherwise, returns all images for the product with the given productId
 */
exports.getProductImages = async (event) => {
  try {
    // Get path parameters
    const imageId = getPathParameter(event, "imageId");
    const productId = getPathParameter(event, "productId");

    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const primaryOnly = queryParams.primaryOnly === "true";

    // Validate parameters
    if (!imageId && !productId) {
      return createResponse(400, {
        error: "Missing parameters",
        message: "Either imageId or productId must be provided",
      });
    }

    // Get image(s)
    let result;
    if (imageId) {
      // Get specific image
      result = await productImageService.getProductImageById(imageId);

      if (!result) {
        return createResponse(404, {
          error: "Image not found",
          message: `No image found with ID ${imageId}`,
        });
      }
    } else if (primaryOnly) {
      // Get primary image only
      result = await productImageService.getPrimaryProductImage(productId);

      if (!result) {
        return createResponse(404, {
          error: "Primary image not found",
          message: `No primary image found for product ID ${productId}`,
        });
      }
    } else {
      // Get all images for product
      result = await productImageService.getProductImages(productId);
    }

    return createResponse(200, result);
  } catch (error) {
    console.error("Error getting product images:", error);
    return handleError(error);
  }
};

/**
 * Create a new product image record in the database
 * Note: This does not upload the actual image file to S3
 * Use the uploadProductImage endpoint to upload files
 */
exports.createProductImageRecord = async (event) => {
  try {
    const body = parseBody(event.body);

    // Validate required fields
    if (!body.product_id) {
      return createResponse(400, {
        error: "Missing required fields",
        message: "product_id is required",
      });
    }

    if (!body.image_url || !body.image_key) {
      return createResponse(400, {
        error: "Missing required fields",
        message: "image_url and image_key are required",
      });
    }

    // Create image record
    const result = await productImageService.createProductImage(body);

    return createResponse(201, {
      message: "Product image record created successfully",
      imageId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating product image record:", error);
    return handleError(error);
  }
};

/**
 * Update an existing product image record
 */
exports.updateProductImageRecord = async (event) => {
  try {
    const imageId = getPathParameter(event, "imageId");
    const body = parseBody(event.body);

    // Validate parameters
    if (!imageId) {
      return createResponse(400, {
        error: "Missing parameters",
        message: "imageId is required",
      });
    }

    // Check if the image exists
    const existingImage = await productImageService.getProductImageById(
      imageId
    );
    if (!existingImage) {
      return createResponse(404, {
        error: "Image not found",
        message: `No image found with ID ${imageId}`,
      });
    }

    // Update image record
    await productImageService.updateProductImage(imageId, body);

    return createResponse(200, {
      message: "Product image record updated successfully",
      imageId: imageId,
    });
  } catch (error) {
    console.error("Error updating product image record:", error);
    return handleError(error);
  }
};

/**
 * Set a product image as the primary image
 */
exports.setPrimaryProductImage = async (event) => {
  try {
    const imageId = getPathParameter(event, "imageId");
    const productId = getPathParameter(event, "productId");

    // Validate parameters
    if (!imageId || !productId) {
      return createResponse(400, {
        error: "Missing parameters",
        message: "Both imageId and productId are required",
      });
    }

    // Check if the image exists and belongs to the product
    const existingImage = await productImageService.getProductImageById(
      imageId
    );
    if (!existingImage) {
      return createResponse(404, {
        error: "Image not found",
        message: `No image found with ID ${imageId}`,
      });
    }

    if (existingImage.product_id != productId) {
      return createResponse(400, {
        error: "Invalid parameters",
        message: `Image with ID ${imageId} does not belong to product with ID ${productId}`,
      });
    }

    // Set as primary
    await productImageService.setPrimaryProductImage(imageId, productId);

    return createResponse(200, {
      message: "Product image set as primary successfully",
      imageId: imageId,
      productId: productId,
    });
  } catch (error) {
    console.error("Error setting primary product image:", error);
    return handleError(error);
  }
};

/**
 * Delete a product image record and optionally the image file from S3
 */
exports.deleteProductImageRecord = async (event) => {
  try {
    const imageId = getPathParameter(event, "imageId");

    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const deleteFromS3 = queryParams.deleteFromS3 !== "false"; // Default to true

    // Validate parameters
    if (!imageId) {
      return createResponse(400, {
        error: "Missing parameters",
        message: "imageId is required",
      });
    }

    // Check if the image exists
    const existingImage = await productImageService.getProductImageById(
      imageId
    );
    if (!existingImage) {
      return createResponse(404, {
        error: "Image not found",
        message: `No image found with ID ${imageId}`,
      });
    }

    // Delete image record and optionally the file from S3
    await productImageService.deleteProductImage(imageId, deleteFromS3);

    return createResponse(200, {
      message: `Product image ${
        deleteFromS3 ? "and file " : ""
      }deleted successfully`,
      imageId: imageId,
    });
  } catch (error) {
    console.error("Error deleting product image:", error);
    return handleError(error);
  }
};

/**
 * Delete all images for a product
 */
exports.deleteProductImages = async (event) => {
  try {
    const productId = getPathParameter(event, "productId");

    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const deleteFromS3 = queryParams.deleteFromS3 !== "false"; // Default to true

    // Validate parameters
    if (!productId) {
      return createResponse(400, {
        error: "Missing parameters",
        message: "productId is required",
      });
    }

    // Delete all images for the product
    await productImageService.deleteProductImages(productId, deleteFromS3);

    return createResponse(200, {
      message: `All product images ${
        deleteFromS3 ? "and files " : ""
      }deleted successfully`,
      productId: productId,
    });
  } catch (error) {
    console.error("Error deleting product images:", error);
    return handleError(error);
  }
};

// ================================
// STRIPE PAYMENT HANDLERS
// ================================

/**
 * Create a payment intent for Stripe
 */
exports.createPaymentIntent = async (event) => {
  try {
    const body = parseBody(event.body);

    // Validate required fields
    if (!body.amount) {
      return createResponse(400, {
        error: "Missing required field",
        message: "amount is required",
      });
    }

    // Validate amount
    if (typeof body.amount !== "number" || body.amount < 50) {
      return createResponse(400, {
        error: "Invalid amount",
        message: "Amount must be a number and at least 50 cents",
      });
    }

    // Set defaults
    const { amount, currency = "eur", items = [], metadata = {} } = body;

    console.log(
      `Creating payment intent: amount=${amount}, currency=${currency}`
    );

    // Add request information to metadata
    const enrichedMetadata = {
      ...metadata,
      created_from: "orsa_ecommerce_api",
      request_id: event.requestContext?.requestId || "unknown",
    };

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent({
      amount,
      currency,
      items,
      metadata: enrichedMetadata,
    });

    return createResponse(200, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);

    // Handle Stripe-specific errors
    if (error.type && error.type.startsWith("Stripe")) {
      return createResponse(400, {
        error: "Payment processing error",
        message: error.message,
      });
    }

    return handleError(error);
  }
};

/**
 * Handle Stripe webhooks
 */
exports.stripeWebhook = async (event) => {
  try {
    const signature =
      event.headers["stripe-signature"] || event.headers["Stripe-Signature"];

    if (!signature) {
      return createResponse(400, {
        error: "Missing signature",
        message: "Stripe signature header is required",
      });
    }

    // Construct the event from the webhook payload
    const stripeEvent = stripeService.constructWebhookEvent(
      event.body,
      signature
    );

    console.log("Received Stripe webhook:", {
      type: stripeEvent.type,
      id: stripeEvent.id,
    });

    // Handle different event types
    switch (stripeEvent.type) {
      case "payment_intent.succeeded":
        const paymentIntent = stripeEvent.data.object;
        console.log("Payment succeeded:", paymentIntent.id);

        // Process the successful payment
        await stripeService.handleSuccessfulPayment(paymentIntent);

        break;

      case "payment_intent.payment_failed":
        const failedPayment = stripeEvent.data.object;
        console.log("Payment failed:", failedPayment.id);

        // Handle failed payment (optional)
        // You could send notification emails, update order status, etc.

        break;

      case "payment_intent.created":
        console.log("Payment intent created:", stripeEvent.data.object.id);
        break;

      default:
        console.log("Unhandled event type:", stripeEvent.type);
    }

    // Return success response to Stripe
    return createResponse(200, {
      received: true,
      eventType: stripeEvent.type,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);

    // Return 400 for signature verification errors
    if (
      error.message.includes("signature") ||
      error.message.includes("webhook")
    ) {
      return createResponse(400, {
        error: "Webhook verification failed",
        message: error.message,
      });
    }

    return handleError(error);
  }
};

/**
 * Get payment intent details
 */
exports.getPaymentIntent = async (event) => {
  try {
    const paymentIntentId = getPathParameter(event, "paymentIntentId");

    if (!paymentIntentId) {
      return createResponse(400, {
        error: "Missing parameter",
        message: "paymentIntentId is required",
      });
    }

    const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);

    // Return only safe information
    return createResponse(200, {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
      created: paymentIntent.created,
    });
  } catch (error) {
    console.error("Error retrieving payment intent:", error);

    if (error.type && error.type.startsWith("Stripe")) {
      return createResponse(404, {
        error: "Payment not found",
        message: "The specified payment intent was not found",
      });
    }

    return handleError(error);
  }
};
