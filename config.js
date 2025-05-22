/**
 * config.js
 * Configuration for different environments (dev, staging, prod)
 * This allows us to hardcode database connection details for development
 * while using environment variables for production.
 */

// Default configuration (development)
const config = {
  db: {
    // If you're running this locally, you'll use these values
    // If running in Lambda, it will use the values from serverless.yml environment section
    host:
      process.env.DB_HOST ||
      "orsa-ecommerce.cjkwgkcwoyr0.eu-west-3.rds.amazonaws.com", // UPDATE THIS
    user: process.env.DB_USER || "admin", // UPDATE THIS if different
    password: process.env.DB_PASSWORD || ".c>0VXNH0_JA4Qa)vy(PeI5Ijw#R", // UPDATE THIS
    database: process.env.DB_NAME || "Orsa",
    port: parseInt(process.env.DB_PORT || "3306", 10),
  },
};

module.exports = config;
