#!/usr/bin/env node

/**
 * VPC Authentication Test Script
 * Tests the authentication flow for VPC functions
 */

const https = require('https');

// Test configuration
const BASE_URL = process.argv[2] || 'https://your-api-gateway-url.execute-api.eu-west-3.amazonaws.com';
const TOKEN = process.argv[3] || 'your-jwt-token-here';

console.log('🧪 VPC Authentication Test Suite');
console.log('==================================');
console.log('Base URL:', BASE_URL);
console.log('Token preview:', TOKEN.substring(0, 50) + '...');
console.log('');

/**
 * Make HTTP request with token
 */
const makeRequest = (path, method = 'GET') => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: data.trim() ? JSON.parse(data) : null
          };
          resolve(result);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

/**
 * Test a specific endpoint
 */
const testEndpoint = async (name, path, expectedStatus = 200) => {
  console.log(`\n📍 Testing ${name}:`);
  console.log(`   Path: ${path}`);
  
  try {
    const result = await makeRequest(path);
    
    console.log(`   Status: ${result.statusCode}`);
    console.log(`   Expected: ${expectedStatus}`);
    
    if (result.statusCode === expectedStatus) {
      console.log('   ✅ PASS');
    } else {
      console.log('   ❌ FAIL');
      console.log('   Response:', JSON.stringify(result.body, null, 2));
    }
    
    return result;
  } catch (error) {
    console.log('   ❌ ERROR');
    console.log('   Error:', error.message);
    return { error: error.message };
  }
};

/**
 * Run all tests
 */
const runTests = async () => {
  console.log('🚀 Starting VPC Authentication Tests...\n');
  
  // Test 1: Non-VPC auth endpoint (should work)
  await testEndpoint('Non-VPC Auth Validation', '/auth/validate', 200);
  
  // Test 2: VPC function with external auth (products)
  await testEndpoint('VPC Function - Get Products', '/products', 200);
  
  // Test 3: VPC function with external auth (users)
  await testEndpoint('VPC Function - Get Users', '/users', 200);
  
  // Test 4: Database connection test (VPC function)
  await testEndpoint('VPC Function - DB Connection Test', '/test-connection', 200);
  
  // Test 5: Invalid endpoint (should return 404, not auth error)
  await testEndpoint('Invalid Endpoint', '/nonexistent', 404);
  
  console.log('\n🏁 Tests completed!');
  console.log('\n💡 Debugging Tips:');
  console.log('   - Check CloudWatch logs for detailed error messages');
  console.log('   - Verify IAM permissions for Lambda-to-Lambda invocation');
  console.log('   - Ensure environment variables are set correctly');
  console.log('   - Check VPC configuration and subnets');
};

// Validate arguments
if (BASE_URL === 'https://your-api-gateway-url.execute-api.eu-west-3.amazonaws.com') {
  console.log('❌ Error: Please provide your actual API Gateway URL');
  console.log('Usage: node test-vpc-auth.js <api-gateway-url> <jwt-token>');
  console.log('Example: node test-vpc-auth.js https://abc123.execute-api.eu-west-3.amazonaws.com eyJ0eXAiOiJKV1Q...');
  process.exit(1);
}

if (TOKEN === 'your-jwt-token-here') {
  console.log('❌ Error: Please provide your actual JWT token');
  console.log('Usage: node test-vpc-auth.js <api-gateway-url> <jwt-token>');
  process.exit(1);
}

// Run the tests
runTests().catch(console.error);
