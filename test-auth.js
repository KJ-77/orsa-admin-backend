/**
 * Test Authentication Script
 * Use this script to test your authentication endpoints after deployment
 */

const https = require("https");

// Replace with your actual API Gateway URL after deployment
const API_BASE_URL = "https://your-api-id.execute-api.eu-west-3.amazonaws.com";

// Replace with actual JWT tokens from Cognito
const TEST_TOKENS = {
  // Get these from your frontend login or Cognito console
  userToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...", // Regular user token
  adminToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...", // Admin user token
};

/**
 * Make an authenticated API request
 */
function makeRequest(endpoint, token) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Test authentication endpoints
 */
async function testAuthentication() {
  console.log("🔐 Testing Authentication System\n");

  try {
    // Test 1: Validate user token
    console.log("1. Testing user token validation...");
    const userValidation = await makeRequest(
      "/auth/validate",
      TEST_TOKENS.userToken
    );
    console.log(`   Status: ${userValidation.statusCode}`);
    console.log(`   Response: ${userValidation.body}\n`);

    // Test 2: Validate admin token
    console.log("2. Testing admin token validation...");
    const adminValidation = await makeRequest(
      "/auth/validate-admin",
      TEST_TOKENS.adminToken
    );
    console.log(`   Status: ${adminValidation.statusCode}`);
    console.log(`   Response: ${adminValidation.body}\n`);

    // Test 3: Try admin endpoint with user token (should fail)
    console.log("3. Testing user token on admin endpoint (should fail)...");
    const unauthorizedTest = await makeRequest(
      "/auth/validate-admin",
      TEST_TOKENS.userToken
    );
    console.log(`   Status: ${unauthorizedTest.statusCode}`);
    console.log(`   Response: ${unauthorizedTest.body}\n`);

    // Test 4: Test protected product endpoint
    console.log("4. Testing protected products endpoint...");
    const productsTest = await makeRequest("/products", TEST_TOKENS.userToken);
    console.log(`   Status: ${productsTest.statusCode}`);
    console.log(`   Response: ${productsTest.body}\n`);
  } catch (error) {
    console.error("❌ Error testing authentication:", error.message);
  }
}

/**
 * Test without authentication (should fail)
 */
async function testWithoutAuth() {
  console.log("🚫 Testing endpoints without authentication\n");

  try {
    const noAuthTest = await makeRequest("/auth/validate", "");
    console.log(`Status: ${noAuthTest.statusCode}`);
    console.log(`Response: ${noAuthTest.body}\n`);
  } catch (error) {
    console.error("Expected error for no auth:", error.message);
  }
}

// Instructions for usage
console.log(`
🔧 Authentication Test Setup Instructions:

1. Deploy your backend:
   npm run deploy

2. Update API_BASE_URL in this file with your actual API Gateway URL

3. Get JWT tokens:
   - Sign in to your frontend application
   - Copy the JWT tokens from browser developer tools
   - Update TEST_TOKENS in this file

4. Run the tests:
   node test-auth.js

📝 Expected Results:
- /auth/validate with user token: 200 OK
- /auth/validate-admin with admin token: 200 OK  
- /auth/validate-admin with user token: 403 Forbidden
- /products with user token: 200 OK
- Any endpoint without token: 401 Unauthorized

🔍 Troubleshooting:
- 401 errors: Check token format and expiration
- 403 errors: Check user group membership
- CORS errors: Verify frontend origin in serverless.yml
`);

// Uncomment to run tests (after updating tokens and URL)
// testAuthentication();
// testWithoutAuth();
