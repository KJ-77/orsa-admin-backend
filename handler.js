/**
 * Main handler file for Orsa E-commerce API
 * Contains all Lambda function handlers for CRUD operations on the database
 */

// Import service modules
const productService = require("./productService");
const userService = require("./userService");
const orderService = require("./orderService");
const imageService = require("./imageService");

// ===========================================
// VALIDATION HELPER FUNCTIONS
// ===========================================

/**
 * Validate email format using comprehensive regex
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid, false otherwise
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate name format (letters, spaces, hyphens, apostrophes only, including international characters)
 * @param {string} name - Name to validate
 * @returns {boolean} True if valid, false otherwise
 */
const validateName = (name) => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  const trimmedName = name.trim();
  if (trimmedName.length === 0 || trimmedName.length > 50) {
    return false;
  }
  // Updated regex to support international characters (Unicode letters)
  const nameRegex = /^[\p{L}\s\-']+$/u;
  return nameRegex.test(trimmedName);
};

/**
 * Validate phone number format (international format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid, false otherwise
 */
const validatePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  // Remove spaces, hyphens, parentheses for validation
  const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, '');
  // Basic international format: + followed by 1-15 digits
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(cleanPhone);
};

// ===========================================
// RATE LIMITING AND MIDDLEWARE
// ===========================================

// In-memory rate limiting store
const rateLimitStore = new Map();

/**
 * Enhanced rate limiting function with automatic cleanup
 * @param {string} ip - Client IP address
 * @returns {boolean} True if rate limited, false otherwise
 */
const isRateLimited = (ip) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  // Clean up old entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, data] of rateLimitStore.entries()) {
      if (now - data.windowStart > windowMs) {
        rateLimitStore.delete(key);
      }
    }
  }

  const clientData = rateLimitStore.get(ip) || { count: 0, windowStart: now };

  // Reset window if expired
  if (now - clientData.windowStart > windowMs) {
    clientData.count = 0;
    clientData.windowStart = now;
  }

  clientData.count++;
  rateLimitStore.set(ip, clientData);

  return clientData.count > maxRequests;
};

/**
 * Enhanced middleware wrapper with comprehensive logging and metrics
 * @param {Function} handler - Lambda handler function
 * @returns {Function} Wrapped handler with middleware
 */
const withMiddleware = (handler) => {
  return async (event, context) => {
    const startTime = Date.now();
    const requestId = context.awsRequestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract client IP
    const clientIp = event.requestContext?.http?.sourceIp || 
                     event.requestContext?.identity?.sourceIp || 
                     event.headers?.['x-forwarded-for']?.split(',')[0] ||
                     'unknown';

    // Log request details
    console.log(`[${requestId}] Incoming request:`, {
      method: event.requestContext?.http?.method || event.httpMethod,
      path: event.requestContext?.http?.path || event.path,
      ip: clientIp,
      userAgent: event.headers?.['user-agent'] || 'unknown'
    });

    try {
      // Rate limiting check
      if (isRateLimited(clientIp)) {
        console.log(`[${requestId}] Rate limit exceeded for IP: ${clientIp}`);
        return {
          statusCode: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'X-Rate-Limit-Remaining': '0'
          },
          body: JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: 900 // 15 minutes in seconds
          })
        };
      }

      // Execute the handler
      const result = await handler(event, context);
      
      const duration = Date.now() - startTime;
      
      // Log successful response
      console.log(`[${requestId}] Request completed:`, {
        statusCode: result.statusCode,
        duration: `${duration}ms`,
        ip: clientIp
      });

      // Add response headers
      result.headers = {
        ...result.headers,
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`,
        'X-Rate-Limit-Remaining': String(100 - (rateLimitStore.get(clientIp)?.count || 0))
      };

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error
      console.error(`[${requestId}] Request failed:`, {
        error: error.message,
        duration: `${duration}ms`,
        ip: clientIp,
        stack: error.stack
      });

      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Response-Time': `${duration}ms`
        },
        body: JSON.stringify({
          error: 'Internal server error',
          message: 'An unexpected error occurred',
          requestId
        })
      };
    }
  };
};

// ===========================================
// RESPONSE AND UTILITY FUNCTIONS
// ===========================================

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
    timestamp: new Date().toISOString(),
  });

  // Database-specific errors
  if (error.code === "ER_NO_SUCH_TABLE") {
    return createResponse(500, {
      error: "Database table does not exist",
      message: "The requested table was not found in the database",
      code: error.code,
    });
  } else if (error.code === "ER_BAD_FIELD_ERROR") {
    return createResponse(400, {
      error: "Invalid field in request",
      message: "One or more fields in the request are not valid for this operation",
      code: error.code,
    });
  } else if (error.code === "ER_DUP_ENTRY") {
    return createResponse(409, {
      error: "Duplicate entry",
      message: "The record you're trying to create already exists",
      code: error.code,
    });
  } else if (error.code === "ER_NO_REFERENCED_ROW_2" || error.code === "ER_NO_REFERENCED_ROW") {
    return createResponse(400, {
      error: "Invalid reference",
      message: "The referenced record does not exist",
      code: error.code,
    });
  } else if (error.code === "ER_ROW_IS_REFERENCED_2" || error.code === "ER_ROW_IS_REFERENCED") {
    return createResponse(409, {
      error: "Cannot delete referenced record",
      message: "This record cannot be deleted because it is referenced by other records",
      code: error.code,
    });
  } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
    return createResponse(500, {
      error: "Database connection failed",
      message: "Unable to connect to database. Please check connection settings and network.",
      details: error.message,
      code: error.code,
    });
  } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
    return createResponse(500, {
      error: "Database access denied",
      message: "Invalid database credentials. Please check your username and password.",
      details: error.message,
      code: error.code,
    });
  } else if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
    return createResponse(500, {
      error: "Database connection timeout",
      message: "Database connection was interrupted or timed out",
      code: error.code,
    });
  } else if (error.code === "ER_TOO_MANY_CONNECTIONS") {
    return createResponse(500, {
      error: "Database connection limit reached",
      message: "Too many database connections. Please try again later.",
      code: error.code,
    });
  } else {
    // Log the full error for debugging
    console.error("Unhandled error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    return createResponse(500, {
      error: "Internal server error",
      message: error.message || "An unexpected error occurred",
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        code: error.code,
      }),
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

/**
 * Validate if a string is a valid positive integer ID
 * @param {string} id - The ID to validate
 * @returns {boolean} Whether the ID is valid
 */
const isValidId = (id) => {
  const num = parseInt(id);
  return !isNaN(num) && num > 0 && num.toString() === id.toString();
};

// ========== Product Handlers ==========

/**
 * Get all products or a single product by ID
 */
exports.getProducts = async (event) => {
  try {
    const productId = getPathParameter(event, "id");

    if (productId) {
      // Validate product ID
      if (!isValidId(productId)) {
        return createResponse(400, {
          error: "Invalid product ID",
          message: "Product ID must be a positive integer",
          providedId: productId,
        });
      }

      // Get a specific product
      const product = await productService.getProductById(productId);

      if (!product) {
        return createResponse(404, { 
          error: "Product not found",
          message: `No product found with ID ${productId}`,
        });
      }

      return createResponse(200, product);
    } else {
      // Get all products with optional pagination
      const queryParams = event.queryStringParameters || {};
      const limit = queryParams.limit ? parseInt(queryParams.limit) : undefined;
      const offset = queryParams.offset ? parseInt(queryParams.offset) : undefined;

      // Validate pagination parameters
      if (limit !== undefined && (isNaN(limit) || limit <= 0 || limit > 100)) {
        return createResponse(400, {
          error: "Invalid limit parameter",
          message: "Limit must be a positive integer between 1 and 100",
        });
      }

      if (offset !== undefined && (isNaN(offset) || offset < 0)) {
        return createResponse(400, {
          error: "Invalid offset parameter",
          message: "Offset must be a non-negative integer",
        });
      }

      const products = await productService.getAllProducts({ limit, offset });
      return createResponse(200, {
        products,
        pagination: {
          limit: limit || null,
          offset: offset || 0,
          count: products.length,
        },
      });
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

    // Comprehensive input validation
    if (!productData.name || !productData.price) {
      return createResponse(400, {
        error: "Product name and price are required",
        provided: {
          name: !!productData.name,
          price: !!productData.price,
        },
      });
    }

    // Validate product name
    if (typeof productData.name !== 'string' || productData.name.trim().length === 0) {
      return createResponse(400, {
        error: "Invalid product name",
        message: "Product name must be a non-empty string",
      });
    }

    // Validate price
    const price = parseFloat(productData.price);
    if (isNaN(price) || price < 0) {
      return createResponse(400, {
        error: "Invalid price",
        message: "Price must be a positive number",
        providedPrice: productData.price,
      });
    }

    // Validate quantity if provided
    if (productData.quantity !== undefined) {
      const quantity = parseInt(productData.quantity);
      if (isNaN(quantity) || quantity < 0) {
        return createResponse(400, {
          error: "Invalid quantity",
          message: "Quantity must be a non-negative integer",
          providedQuantity: productData.quantity,
        });
      }
      productData.quantity = quantity;
    }

    // Sanitize and validate description
    if (productData.description) {
      if (typeof productData.description !== 'string') {
        return createResponse(400, {
          error: "Invalid description",
          message: "Description must be a string",
        });
      }
      // Limit description length
      if (productData.description.length > 1000) {
        return createResponse(400, {
          error: "Description too long",
          message: "Description must be less than 1000 characters",
          currentLength: productData.description.length,
        });
      }
    }

    // Sanitize product name (remove potentially harmful characters)
    productData.name = productData.name.trim().replace(/[<>]/g, '');
    productData.price = price;

    const result = await productService.createProduct(productData);

    return createResponse(201, {
      message: "Product created successfully",
      productId: result.insertId,
      product: {
        id: result.insertId,
        name: productData.name,
        price: productData.price,
        quantity: productData.quantity || 0,
        description: productData.description || null,
      },
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
      return createResponse(400, { 
        error: "Product ID is required",
        message: "Please provide a valid product ID in the URL path",
      });
    }

    // Validate product ID
    if (!isValidId(productId)) {
      return createResponse(400, {
        error: "Invalid product ID",
        message: "Product ID must be a positive integer",
        providedId: productId,
      });
    }

    // Check if there's any data to update
    if (!productData || Object.keys(productData).length === 0) {
      return createResponse(400, {
        error: "No update data provided",
        message: "Please provide at least one field to update",
      });
    }

    // Validate individual fields if provided
    if (productData.name !== undefined) {
      if (typeof productData.name !== 'string' || productData.name.trim().length === 0) {
        return createResponse(400, {
          error: "Invalid product name",
          message: "Product name must be a non-empty string",
        });
      }
      productData.name = productData.name.trim().replace(/[<>]/g, '');
    }

    if (productData.price !== undefined) {
      const price = parseFloat(productData.price);
      if (isNaN(price) || price < 0) {
        return createResponse(400, {
          error: "Invalid price",
          message: "Price must be a positive number",
          providedPrice: productData.price,
        });
      }
      productData.price = price;
    }

    if (productData.quantity !== undefined) {
      const quantity = parseInt(productData.quantity);
      if (isNaN(quantity) || quantity < 0) {
        return createResponse(400, {
          error: "Invalid quantity",
          message: "Quantity must be a non-negative integer",
          providedQuantity: productData.quantity,
        });
      }
      productData.quantity = quantity;
    }

    if (productData.description !== undefined) {
      if (typeof productData.description !== 'string') {
        return createResponse(400, {
          error: "Invalid description",
          message: "Description must be a string",
        });
      }
      if (productData.description.length > 1000) {
        return createResponse(400, {
          error: "Description too long",
          message: "Description must be less than 1000 characters",
          currentLength: productData.description.length,
        });
      }
    }

    // Check if product exists
    const product = await productService.getProductById(productId);
    if (!product) {
      return createResponse(404, { 
        error: "Product not found",
        message: `No product found with ID ${productId}`,
      });
    }

    await productService.updateProduct(productId, productData);

    return createResponse(200, {
      message: "Product updated successfully",
      productId: parseInt(productId),
      updatedFields: Object.keys(productData),
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
        provided: {
          first_name: !!userData.first_name,
          last_name: !!userData.last_name,
          email: !!userData.email,
        },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return createResponse(400, {
        error: "Invalid email format",
        message: "Please provide a valid email address",
        providedEmail: userData.email,
      });
    }

    // Validate names (no numbers or special characters except spaces, hyphens, and apostrophes)
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(userData.first_name)) {
      return createResponse(400, {
        error: "Invalid first name",
        message: "First name can only contain letters, spaces, hyphens, and apostrophes",
      });
    }

    if (!nameRegex.test(userData.last_name)) {
      return createResponse(400, {
        error: "Invalid last name",
        message: "Last name can only contain letters, spaces, hyphens, and apostrophes",
      });
    }

    // Validate phone number if provided
    if (userData.phone_number) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(userData.phone_number)) {
        return createResponse(400, {
          error: "Invalid phone number format",
          message: "Phone number can only contain digits, spaces, hyphens, plus signs, and parentheses",
        });
      }
    }

    // Validate birthdate if provided
    if (userData.birthdate) {
      const birthDate = new Date(userData.birthdate);
      if (isNaN(birthDate.getTime())) {
        return createResponse(400, {
          error: "Invalid birthdate",
          message: "Please provide a valid date",
        });
      }

      // Check if birthdate is not in the future
      if (birthDate > new Date()) {
        return createResponse(400, {
          error: "Invalid birthdate",
          message: "Birthdate cannot be in the future",
        });
      }

      // Check if person is not older than 150 years
      const maxAge = new Date();
      maxAge.setFullYear(maxAge.getFullYear() - 150);
      if (birthDate < maxAge) {
        return createResponse(400, {
          error: "Invalid birthdate",
          message: "Birthdate cannot be more than 150 years ago",
        });
      }
    }

    // Validate gender if provided
    if (userData.gender && !['male', 'female', 'other', 'prefer_not_to_say'].includes(userData.gender.toLowerCase())) {
      return createResponse(400, {
        error: "Invalid gender",
        message: "Gender must be one of: male, female, other, prefer_not_to_say",
      });
    }

    // Sanitize string inputs
    userData.first_name = userData.first_name.trim();
    userData.last_name = userData.last_name.trim();
    userData.email = userData.email.trim().toLowerCase();
    
    if (userData.address) {
      userData.address = userData.address.trim();
      if (userData.address.length > 500) {
        return createResponse(400, {
          error: "Address too long",
          message: "Address must be less than 500 characters",
        });
      }
    }

    const result = await userService.createUser(userData);

    return createResponse(201, {
      message: "User created successfully",
      userId: result.insertId,
      user: {
        id: result.insertId,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
      },
    });
  } catch (error) {
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return createResponse(409, {
        error: "Email already exists",
        message: "A user with this email address already exists",
      });
    }
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
      return createResponse(400, { 
        error: "User ID is required",
        message: "Please provide a valid user ID in the URL path",
      });
    }

    // Validate user ID format
    if (!isValidId(userId)) {
      return createResponse(400, {
        error: "Invalid user ID format",
        message: "User ID must be a positive integer",
        providedId: userId,
      });
    }

    // Check if user exists
    const user = await userService.getUserById(userId);
    if (!user) {
      return createResponse(404, { 
        error: "User not found",
        message: `No user found with ID ${userId}`,
      });
    }

    // Validate and sanitize input data if provided
    if (userData.email !== undefined) {
      if (typeof userData.email !== 'string') {
        return createResponse(400, {
          error: "Invalid email format",
          message: "Email must be a string",
        });
      }

      userData.email = userData.email.trim().toLowerCase();
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        return createResponse(400, {
          error: "Invalid email format",
          message: "Please provide a valid email address",
          providedEmail: userData.email,
        });
      }
    }

    // Validate names
    if (userData.first_name !== undefined) {
      if (typeof userData.first_name !== 'string') {
        return createResponse(400, {
          error: "Invalid first name format",
          message: "First name must be a string",
        });
      }

      userData.first_name = userData.first_name.trim();
      
      if (userData.first_name.length === 0) {
        return createResponse(400, {
          error: "First name cannot be empty",
          message: "Please provide a valid first name",
        });
      }

      // Name validation (only letters, spaces, hyphens, apostrophes)
      const nameRegex = /^[a-zA-Z\s\-']+$/;
      if (!nameRegex.test(userData.first_name)) {
        return createResponse(400, {
          error: "Invalid first name format",
          message: "First name can only contain letters, spaces, hyphens, and apostrophes",
          providedName: userData.first_name,
        });
      }
    }

    if (userData.last_name !== undefined) {
      if (typeof userData.last_name !== 'string') {
        return createResponse(400, {
          error: "Invalid last name format",
          message: "Last name must be a string",
        });
      }

      userData.last_name = userData.last_name.trim();
      
      if (userData.last_name.length === 0) {
        return createResponse(400, {
          error: "Last name cannot be empty",
          message: "Please provide a valid last name",
        });
      }

      const nameRegex = /^[a-zA-Z\s\-']+$/;
      if (!nameRegex.test(userData.last_name)) {
        return createResponse(400, {
          error: "Invalid last name format",
          message: "Last name can only contain letters, spaces, hyphens, and apostrophes",
          providedName: userData.last_name,
        });
      }
    }

    // Validate phone number
    if (userData.phone_number !== undefined) {
      if (typeof userData.phone_number !== 'string') {
        return createResponse(400, {
          error: "Invalid phone number format",
          message: "Phone number must be a string",
        });
      }

      userData.phone_number = userData.phone_number.trim();
      
      // Phone number validation (basic international format)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(userData.phone_number.replace(/[\s\-\(\)]/g, ''))) {
        return createResponse(400, {
          error: "Invalid phone number format",
          message: "Please provide a valid phone number",
          providedPhone: userData.phone_number,
        });
      }
    }

    // Validate birthdate
    if (userData.birthdate !== undefined) {
      const birthDate = new Date(userData.birthdate);
      
      if (isNaN(birthDate.getTime())) {
        return createResponse(400, {
          error: "Invalid birthdate format",
          message: "Please provide a valid date in YYYY-MM-DD format",
          providedDate: userData.birthdate,
        });
      }

      // Check if birthdate is not in the future
      if (birthDate > new Date()) {
        return createResponse(400, {
          error: "Invalid birthdate",
          message: "Birthdate cannot be in the future",
          providedDate: userData.birthdate,
        });
      }

      // Check if birthdate is not more than 150 years ago
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 150);
      if (birthDate < minDate) {
        return createResponse(400, {
          error: "Invalid birthdate",
          message: "Birthdate cannot be more than 150 years ago",
          providedDate: userData.birthdate,
        });
      }
    }

    // Validate gender
    if (userData.gender !== undefined) {
      if (typeof userData.gender !== 'string') {
        return createResponse(400, {
          error: "Invalid gender format",
          message: "Gender must be a string",
        });
      }

      userData.gender = userData.gender.trim().toLowerCase();
      
      const validGenders = ['male', 'female', 'other', 'prefer not to say'];
      if (!validGenders.includes(userData.gender)) {
        return createResponse(400, {
          error: "Invalid gender",
          message: `Gender must be one of: ${validGenders.join(', ')}`,
          providedGender: userData.gender,
        });
      }
    }

    // Validate address
    if (userData.address !== undefined) {
      if (typeof userData.address !== 'string') {
        return createResponse(400, {
          error: "Invalid address format",
          message: "Address must be a string",
        });
      }

      userData.address = userData.address.trim();
      
      if (userData.address.length > 500) {
        return createResponse(400, {
          error: "Address too long",
          message: "Address must be less than 500 characters",
          currentLength: userData.address.length,
        });
      }
    }

    // Only proceed if there are fields to update
    const updatableFields = ['first_name', 'last_name', 'email', 'phone_number', 'birthdate', 'gender', 'address'];
    const hasValidUpdates = Object.keys(userData).some(key => updatableFields.includes(key));
    
    if (!hasValidUpdates) {
      return createResponse(400, {
        error: "No valid fields to update",
        message: `Updatable fields are: ${updatableFields.join(', ')}`,
        providedFields: Object.keys(userData),
      });
    }

    await userService.updateUser(userId, userData);

    return createResponse(200, {
      message: "User updated successfully",
      userId: parseInt(userId),
      updatedFields: Object.keys(userData).filter(key => updatableFields.includes(key)),
    });
  } catch (error) {
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return createResponse(409, {
        error: "Email already exists",
        message: "A user with this email address already exists",
      });
    }
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
      return createResponse(400, { 
        error: "User ID is required",
        message: "Please provide a valid user ID for the order",
      });
    }

    // Validate user_id
    if (!isValidId(orderData.user_id)) {
      return createResponse(400, {
        error: "Invalid user ID",
        message: "User ID must be a positive integer",
        providedUserId: orderData.user_id,
      });
    }

    // Validate order status if provided
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (orderData.order_status && !validStatuses.includes(orderData.order_status.toLowerCase())) {
      return createResponse(400, {
        error: "Invalid order status",
        message: `Order status must be one of: ${validStatuses.join(', ')}`,
        providedStatus: orderData.order_status,
      });
    }

    // Validate total_price if provided
    if (orderData.total_price !== undefined) {
      const totalPrice = parseFloat(orderData.total_price);
      if (isNaN(totalPrice) || totalPrice < 0) {
        return createResponse(400, {
          error: "Invalid total price",
          message: "Total price must be a non-negative number",
          providedPrice: orderData.total_price,
        });
      }
      orderData.total_price = totalPrice;
    }

    // Validate items if provided
    if (orderData.items) {
      if (!Array.isArray(orderData.items)) {
        return createResponse(400, {
          error: "Invalid items format",
          message: "Items must be an array",
        });
      }

      // Validate each item
      for (let i = 0; i < orderData.items.length; i++) {
        const item = orderData.items[i];
        
        if (!item.product_id || !isValidId(item.product_id)) {
          return createResponse(400, {
            error: `Invalid product ID in item ${i + 1}`,
            message: "Each item must have a valid product ID",
          });
        }

        if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity <= 0) {
          return createResponse(400, {
            error: `Invalid quantity in item ${i + 1}`,
            message: "Each item must have a positive integer quantity",
          });
        }

        const unitPrice = parseFloat(item.unit_price);
        if (isNaN(unitPrice) || unitPrice < 0) {
          return createResponse(400, {
            error: `Invalid unit price in item ${i + 1}`,
            message: "Each item must have a valid non-negative unit price",
          });
        }
        item.unit_price = unitPrice;

        // Validate product_name if provided
        if (item.product_name && typeof item.product_name !== 'string') {
          return createResponse(400, {
            error: `Invalid product name in item ${i + 1}`,
            message: "Product name must be a string",
          });
        }
      }
    }

    // Sanitize string inputs
    if (orderData.user_name) {
      orderData.user_name = orderData.user_name.trim();
    }
    if (orderData.user_location) {
      orderData.user_location = orderData.user_location.trim();
      if (orderData.user_location.length > 500) {
        return createResponse(400, {
          error: "Location too long",
          message: "User location must be less than 500 characters",
        });
      }
    }

    const result = await orderService.createOrder(orderData);

    return createResponse(201, {
      message: "Order created successfully",
      orderId: result.id,
      totalPrice: result.total_price,
      itemCount: orderData.items ? orderData.items.length : 0,
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
      return createResponse(400, { 
        error: "Order ID is required",
        message: "Please provide a valid order ID in the URL path",
      });
    }

    // Validate order ID format
    if (!isValidId(orderId)) {
      return createResponse(400, {
        error: "Invalid order ID format",
        message: "Order ID must be a positive integer",
        providedId: orderId,
      });
    }

    // Check if order exists
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return createResponse(404, { 
        error: "Order not found",
        message: `No order found with ID ${orderId}`,
      });
    }

    // Validate and sanitize input data if provided
    if (orderData.user_id !== undefined) {
      if (!isValidId(orderData.user_id)) {
        return createResponse(400, {
          error: "Invalid user ID",
          message: "User ID must be a positive integer",
          providedUserId: orderData.user_id,
        });
      }
    }

    // Validate order status
    if (orderData.order_status !== undefined) {
      if (typeof orderData.order_status !== 'string') {
        return createResponse(400, {
          error: "Invalid order status format",
          message: "Order status must be a string",
        });
      }

      orderData.order_status = orderData.order_status.trim().toLowerCase();
      
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(orderData.order_status)) {
        return createResponse(400, {
          error: "Invalid order status",
          message: `Order status must be one of: ${validStatuses.join(', ')}`,
          providedStatus: orderData.order_status,
        });
      }
    }

    // Validate total_price
    if (orderData.total_price !== undefined) {
      if (typeof orderData.total_price !== 'number' && typeof orderData.total_price !== 'string') {
        return createResponse(400, {
          error: "Invalid total price format",
          message: "Total price must be a number or numeric string",
        });
      }

      const totalPrice = parseFloat(orderData.total_price);
      if (isNaN(totalPrice) || totalPrice < 0) {
        return createResponse(400, {
          error: "Invalid total price",
          message: "Total price must be a non-negative number",
          providedPrice: orderData.total_price,
        });
      }
      orderData.total_price = totalPrice;
    }

    // Validate user_name
    if (orderData.user_name !== undefined) {
      if (typeof orderData.user_name !== 'string') {
        return createResponse(400, {
          error: "Invalid user name format",
          message: "User name must be a string",
        });
      }

      orderData.user_name = orderData.user_name.trim();
      
      if (orderData.user_name.length === 0) {
        return createResponse(400, {
          error: "User name cannot be empty",
          message: "Please provide a valid user name",
        });
      }

      // Remove potentially harmful characters
      orderData.user_name = orderData.user_name.replace(/[<>]/g, '');

      if (orderData.user_name.length > 100) {
        return createResponse(400, {
          error: "User name too long",
          message: "User name must be less than 100 characters",
          currentLength: orderData.user_name.length,
        });
      }
    }

    // Validate user_location
    if (orderData.user_location !== undefined) {
      if (typeof orderData.user_location !== 'string') {
        return createResponse(400, {
          error: "Invalid user location format",
          message: "User location must be a string",
        });
      }

      orderData.user_location = orderData.user_location.trim();
      
      if (orderData.user_location.length > 500) {
        return createResponse(400, {
          error: "User location too long",
          message: "User location must be less than 500 characters",
          currentLength: orderData.user_location.length,
        });
      }

      // Remove potentially harmful characters
      orderData.user_location = orderData.user_location.replace(/[<>]/g, '');
    }

    // Only proceed if there are fields to update
    const updatableFields = ['user_id', 'user_name', 'user_location', 'order_status', 'total_price'];
    const hasValidUpdates = Object.keys(orderData).some(key => updatableFields.includes(key));
    
    if (!hasValidUpdates) {
      return createResponse(400, {
        error: "No valid fields to update",
        message: `Updatable fields are: ${updatableFields.join(', ')}`,
        providedFields: Object.keys(orderData),
      });
    }

    const result = await orderService.updateOrder(orderId, orderData);

    return createResponse(200, {
      message: result.message || "Order updated successfully",
      orderId: parseInt(orderId),
      updatedFields: Object.keys(orderData).filter(key => updatableFields.includes(key)),
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
      return createResponse(400, { 
        error: "Order ID is required",
        message: "Please provide a valid order ID in the URL path",
      });
    }

    // Validate order ID format
    if (!isValidId(orderId)) {
      return createResponse(400, {
        error: "Invalid order ID format",
        message: "Order ID must be a positive integer",
        providedId: orderId,
      });
    }

    // Validate required fields
    if (!itemData.product_id || !itemData.quantity || !itemData.unit_price) {
      return createResponse(400, {
        error: "Missing required fields",
        message: "Product ID, quantity, and unit price are required",
        requiredFields: ['product_id', 'quantity', 'unit_price'],
        providedFields: Object.keys(itemData),
      });
    }

    // Validate product_id
    if (!isValidId(itemData.product_id)) {
      return createResponse(400, {
        error: "Invalid product ID",
        message: "Product ID must be a positive integer",
        providedProductId: itemData.product_id,
      });
    }

    // Validate quantity
    if (typeof itemData.quantity !== 'number' && typeof itemData.quantity !== 'string') {
      return createResponse(400, {
        error: "Invalid quantity format",
        message: "Quantity must be a number or numeric string",
      });
    }

    const quantity = parseInt(itemData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      return createResponse(400, {
        error: "Invalid quantity",
        message: "Quantity must be a positive integer",
        providedQuantity: itemData.quantity,
      });
    }

    if (quantity > 10000) {
      return createResponse(400, {
        error: "Quantity too large",
        message: "Quantity cannot exceed 10,000 items",
        providedQuantity: quantity,
      });
    }

    itemData.quantity = quantity;

    // Validate unit_price
    if (typeof itemData.unit_price !== 'number' && typeof itemData.unit_price !== 'string') {
      return createResponse(400, {
        error: "Invalid unit price format",
        message: "Unit price must be a number or numeric string",
      });
    }

    const unitPrice = parseFloat(itemData.unit_price);
    if (isNaN(unitPrice) || unitPrice < 0) {
      return createResponse(400, {
        error: "Invalid unit price",
        message: "Unit price must be a non-negative number",
        providedUnitPrice: itemData.unit_price,
      });
    }

    if (unitPrice > 1000000) {
      return createResponse(400, {
        error: "Unit price too high",
        message: "Unit price cannot exceed $1,000,000",
        providedUnitPrice: unitPrice,
      });
    }

    itemData.unit_price = unitPrice;

    // Validate product_name if provided
    if (itemData.product_name !== undefined) {
      if (typeof itemData.product_name !== 'string') {
        return createResponse(400, {
          error: "Invalid product name format",
          message: "Product name must be a string",
        });
      }

      itemData.product_name = itemData.product_name.trim();
      
      if (itemData.product_name.length === 0) {
        return createResponse(400, {
          error: "Product name cannot be empty",
          message: "Please provide a valid product name",
        });
      }

      // Remove potentially harmful characters
      itemData.product_name = itemData.product_name.replace(/[<>]/g, '');

      if (itemData.product_name.length > 255) {
        return createResponse(400, {
          error: "Product name too long",
          message: "Product name must be less than 255 characters",
          currentLength: itemData.product_name.length,
        });
      }
    }

    // Calculate total price for validation
    const itemTotal = quantity * unitPrice;
    if (itemTotal > 10000000) {
      return createResponse(400, {
        error: "Item total too high",
        message: "Total item price cannot exceed $10,000,000",
        calculatedTotal: itemTotal,
      });
    }

    // Check if order exists
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return createResponse(404, { 
        error: "Order not found",
        message: `No order found with ID ${orderId}`,
      });
    }

    // Check if order is in a state that allows adding items
    const editableStatuses = ['pending', 'confirmed'];
    if (!editableStatuses.includes(order.order_status?.toLowerCase())) {
      return createResponse(400, {
        error: "Order cannot be modified",
        message: `Items can only be added to orders with status: ${editableStatuses.join(', ')}`,
        currentStatus: order.order_status,
      });
    }    const result = await orderService.addOrderItem(orderId, itemData);

    return createResponse(201, {
      message: "Item added to order successfully",
      orderId: parseInt(orderId),
      itemDetails: {
        productId: itemData.product_id,
        quantity: itemData.quantity,
        unitPrice: itemData.unit_price,
        totalPrice: result.item_total,
      },
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
      return createResponse(400, { 
        error: "Item ID is required",
        message: "Please provide a valid item ID in the URL path",
      });
    }

    // Validate item ID format
    if (!isValidId(itemId)) {
      return createResponse(400, {
        error: "Invalid item ID format",
        message: "Item ID must be a positive integer",
        providedId: itemId,
      });
    }    await orderService.removeOrderItem(itemId);

    return createResponse(200, {
      message: "Item removed from order successfully",
      itemId: parseInt(itemId),
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

/**
 * Test Secrets Manager access
 */
exports.testSecretsManager = async (event) => {
  try {
    const config = require('./config');
    
    console.log("Testing Secrets Manager access...");
    
    // Test direct secret retrieval
    const credentials = await config.getDbCredentials();
    
    return createResponse(200, {
      message: "Secrets Manager test successful",
      hasCredentials: !!credentials,
      hasUsername: !!credentials?.username,
      hasPassword: !!credentials?.password,
      usernameLength: credentials?.username?.length || 0
    });
    
  } catch (error) {
    console.error("Secrets Manager test failed:", error);
    return createResponse(500, {
      error: "Secrets Manager test failed",
      message: error.message,
      code: error.code,
      name: error.name
    });
  }
};

/**
 * Get comprehensive API documentation
 */
exports.getApiDocumentation = async (event) => {
  try {
    const apiDocs = {
      title: "Orsa E-commerce Admin API",
      version: "1.0.0",
      description: "Comprehensive API for managing products, users, orders, and images in the Orsa e-commerce admin system",
      baseUrl: process.env.API_GATEWAY_URL || "https://your-api-gateway-url.com",
      authentication: {
        type: "API Gateway",
        description: "This API is designed to be used behind API Gateway with proper authentication"
      },
      rateLimit: {
        window: "15 minutes",
        maxRequests: 100,
        policy: "per IP address"
      },
      endpoints: {
        products: {
          "GET /products": {
            description: "Get all products with optional pagination",
            parameters: {
              query: {
                limit: "integer (1-100) - Maximum number of products to return",
                offset: "integer (0+) - Number of products to skip"
              }
            },
            responses: {
              200: "List of products with pagination info",
              400: "Invalid pagination parameters"
            }
          },
          "GET /products/{id}": {
            description: "Get a specific product by ID",
            parameters: {
              path: {
                id: "integer - Product ID (positive integer)"
              }
            },
            responses: {
              200: "Product details",
              400: "Invalid product ID format",
              404: "Product not found"
            }
          },
          "POST /products": {
            description: "Create a new product",
            requestBody: {
              required: ["name", "price"],
              optional: ["quantity", "description"],
              validation: {
                name: "string (1-255 chars, no HTML)",
                price: "number (positive)",
                quantity: "integer (0+)",
                description: "string (max 1000 chars)"
              }
            },
            responses: {
              201: "Product created successfully",
              400: "Validation error"
            }
          },
          "PUT /products/{id}": {
            description: "Update an existing product",
            parameters: {
              path: {
                id: "integer - Product ID"
              }
            },
            requestBody: {
              optional: ["name", "price", "quantity", "description"],
              validation: "Same as POST /products"
            },
            responses: {
              200: "Product updated successfully",
              400: "Validation error",
              404: "Product not found"
            }
          },
          "DELETE /products/{id}": {
            description: "Delete a product",
            parameters: {
              path: {
                id: "integer - Product ID"
              }
            },
            responses: {
              200: "Product deleted successfully",
              404: "Product not found"
            }
          }
        },
        users: {
          "GET /users": {
            description: "Get all users (sensitive data excluded)",
            responses: {
              200: "List of users"
            }
          },
          "GET /users/{id}": {
            description: "Get a specific user by ID",
            parameters: {
              path: {
                id: "integer - User ID"
              }
            },
            responses: {
              200: "User details",
              404: "User not found"
            }
          },
          "POST /users": {
            description: "Create a new user",
            requestBody: {
              required: ["first_name", "last_name", "email"],
              optional: ["phone_number", "birthdate", "gender", "address"],
              validation: {
                first_name: "string (letters, spaces, hyphens, apostrophes only)",
                last_name: "string (letters, spaces, hyphens, apostrophes only)",
                email: "string (valid email format)",
                phone_number: "string (international format)",
                birthdate: "date (YYYY-MM-DD, not future, not >150 years old)",
                gender: "string (male, female, other, prefer not to say)",
                address: "string (max 500 chars)"
              }
            },
            responses: {
              201: "User created successfully",
              400: "Validation error",
              409: "Email already exists"
            }
          },
          "PUT /users/{id}": {
            description: "Update an existing user",
            parameters: {
              path: {
                id: "integer - User ID"
              }
            },
            requestBody: {
              optional: ["first_name", "last_name", "email", "phone_number", "birthdate", "gender", "address"],
              validation: "Same as POST /users"
            },
            responses: {
              200: "User updated successfully",
              400: "Validation error",
              404: "User not found",
              409: "Email already exists"
            }
          },
          "DELETE /users/{id}": {
            description: "Delete a user",
            parameters: {
              path: {
                id: "integer - User ID"
              }
            },
            responses: {
              200: "User deleted successfully",
              404: "User not found"
            }
          }
        },
        orders: {
          "GET /orders": {
            description: "Get all orders with basic information",
            responses: {
              200: "List of orders"
            }
          },
          "GET /orders/{id}": {
            description: "Get a specific order with items",
            parameters: {
              path: {
                id: "integer - Order ID"
              }
            },
            responses: {
              200: "Order details with items",
              404: "Order not found"
            }
          },
          "POST /orders": {
            description: "Create a new order with items",
            requestBody: {
              required: ["user_id"],
              optional: ["user_name", "user_location", "order_status", "total_price", "items"],
              validation: {
                user_id: "integer (positive)",
                user_name: "string (max 100 chars, no HTML)",
                user_location: "string (max 500 chars)",
                order_status: "string (pending, confirmed, processing, shipped, delivered, cancelled)",
                total_price: "number (non-negative)",
                items: "array of objects with product_id, quantity, unit_price, product_name"
              }
            },
            responses: {
              201: "Order created successfully",
              400: "Validation error"
            }
          },
          "PUT /orders/{id}": {
            description: "Update an existing order",
            parameters: {
              path: {
                id: "integer - Order ID"
              }
            },
            requestBody: {
              optional: ["user_id", "user_name", "user_location", "order_status", "total_price"],
              validation: "Same as POST /orders (except items)"
            },
            responses: {
              200: "Order updated successfully",
              400: "Validation error",
              404: "Order not found"
            }
          },
          "DELETE /orders/{id}": {
            description: "Delete an order and its items",
            parameters: {
              path: {
                id: "integer - Order ID"
              }
            },
            responses: {
              200: "Order deleted successfully",
              404: "Order not found"
            }
          },
          "POST /orders/{id}/items": {
            description: "Add an item to an existing order",
            parameters: {
              path: {
                id: "integer - Order ID"
              }
            },
            requestBody: {
              required: ["product_id", "quantity", "unit_price"],
              optional: ["product_name"],
              validation: {
                product_id: "integer (positive)",
                quantity: "integer (1-10000)",
                unit_price: "number (0-1000000)",
                product_name: "string (max 255 chars)"
              }
            },
            responses: {
              201: "Item added successfully",
              400: "Validation error or order cannot be modified",
              404: "Order not found"
            }
          },
          "DELETE /orders/items/{itemId}": {
            description: "Remove an item from an order",
            parameters: {
              path: {
                itemId: "integer - Order item ID"
              }
            },
            responses: {
              200: "Item removed successfully",
              400: "Invalid item ID",
              404: "Item not found"
            }
          },
          "GET /orders/total-price": {
            description: "Get total price within a date range",
            parameters: {
              query: {
                from: "date (YYYY-MM-DD) - Start date (optional)",
                to: "date (YYYY-MM-DD) - End date (optional)"
              }
            },
            responses: {
              200: "Total price with date range"
            }
          }
        },
        images: {
          "POST /products/images/upload": {
            description: "Upload a product image to S3",
            requestBody: {
              required: ["image", "filename"],
              validation: {
                image: "string (base64 encoded image)",
                filename: "string (safe filename, image extension)",
                contentType: "string (image MIME type)"
              },
              constraints: {
                fileSize: "1KB - 5MB",
                formats: "JPEG, PNG, GIF, WebP, SVG",
                security: "Magic bytes validation, filename sanitization"
              }
            },
            responses: {
              201: "Image uploaded successfully",
              400: "Validation error or invalid file format",
              413: "File too large"
            }
          },
          "DELETE /products/images/{imageKey}": {
            description: "Delete a product image from S3",
            parameters: {
              path: {
                imageKey: "string - S3 object key"
              }
            },
            responses: {
              200: "Image deleted successfully",
              404: "Image not found",
              500: "Storage configuration error"
            }
          },
          "GET /products/images": {
            description: "Get list of product images",
            responses: {
              200: "List of available images with metadata"
            }
          }
        },
        testing: {
          "GET /test/db-connection": {
            description: "Test database connectivity and diagnose issues",
            responses: {
              200: "Connection successful",
              500: "Connection failed with diagnostic info"
            }
          },
          "GET /test/secrets": {
            description: "Test AWS Secrets Manager connectivity",
            responses: {
              200: "Secrets accessible",
              500: "Secrets access failed"
            }
          }
        }
      },
      errorCodes: {
        400: "Bad Request - Invalid input or validation error",
        401: "Unauthorized - Authentication required",
        403: "Forbidden - Insufficient permissions",
        404: "Not Found - Resource does not exist",
        409: "Conflict - Resource already exists (e.g., duplicate email)",
        413: "Payload Too Large - File or request body too large",
        429: "Too Many Requests - Rate limit exceeded",
        500: "Internal Server Error - Server-side error"
      },
      validationRules: {
        ids: "Must be positive integers",
        emails: "Must be valid email format",
        prices: "Must be non-negative numbers",
        quantities: "Must be non-negative integers",
        strings: "HTML tags are stripped, length limits enforced",
        dates: "ISO format (YYYY-MM-DD) preferred",
        images: "Base64 encoded, validated by magic bytes"
      },
      security: {
        inputSanitization: "All string inputs are sanitized to remove harmful characters",
        rateLimiting: "100 requests per 15 minutes per IP address",
        fileValidation: "Images validated by magic bytes, not just file extension",
        errorHandling: "Detailed errors in development, generic in production"
      },
      examples: {
        createProduct: {
          request: {
            name: "Premium Widget",
            price: 29.99,
            quantity: 100,
            description: "A high-quality widget for all your needs"
          },
          response: {
            message: "Product created successfully",
            productId: 123,
            product: {
              id: 123,
              name: "Premium Widget",
              price: 29.99,
              quantity: 100,
              description: "A high-quality widget for all your needs"
            }
          }
        },
        createUser: {
          request: {
            first_name: "John",
            last_name: "Doe",
            email: "john.doe@example.com",
            phone_number: "+1234567890",
            birthdate: "1990-01-01",
            gender: "male",
            address: "123 Main St, Anytown, USA"
          },
          response: {
            message: "User created successfully",
            userId: 456,
            user: {
              id: 456,
              first_name: "John",
              last_name: "Doe",
              email: "john.doe@example.com"
            }
          }
        }
      }
    };

    return createResponse(200, apiDocs);
  } catch (error) {
    return handleError(error);
  }
};

// Export validation functions for testing
module.exports.validateEmail = validateEmail;
module.exports.validateName = validateName;
module.exports.validatePhoneNumber = validatePhoneNumber;
module.exports.isRateLimited = isRateLimited;
module.exports.withMiddleware = withMiddleware;
