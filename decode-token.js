#!/usr/bin/env node

/**
 * JWT Token Decoder and Validator
 * Helps debug token issues
 */

const jwt = require('jsonwebtoken');

// Get token from command line or use test token
const token = process.argv[2] || 'eyJraWQiOiJDaCtqVVZcL3VaZmNtOU53NWxLRFdvRTFmNG5FK3RjZEZFK3hGQWkweHJKOD0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJiOWE5YWI3NC00OGYzLTcwMGEtOWI4My1hMzc0MzgwNjNhNWMiLCJjb2duaXRvOmdyb3VwcyI6WyJhZG1pbnMiXSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmV1LXdlc3QtMy5hbWF6b25hd3MuY29tXC9ldS13ZXN0LTNfaGpHZkxaNGVrIiwiY2xpZW50X2lkIjoiMjhlc3Y4cTc3ZGwzcjJnb2kxbXNrbDBpbGIiLCJvcmlnaW5fanRpIjoiNTMzYjFhZmMtNzZjNy00NTY0LWE1ZWYtNWNkNjE4MDBmZGVlIiwiZXZlbnRfaWQiOiI1MWEwNWI1Yi01YWQzLTQ3MDItOTMyMi1hYWI3ZTkwMGNhNDMiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6ImF3cy5jb2duaXRvLnNpZ25pbi51c2VyLmFkbWluIiwiYXV0aF90aW1lIjoxNzM1NTM1ODE5LCJleHAiOjE3MzU1Mzk0MTksImlhdCI6MTczNTUzNTgxOSwianRpIjoiOWE5NzE0MmItNzA0YS00YjNkLTgyM2UtODU3ZGU4OTczMWYyIiwidXNlcm5hbWUiOiJhZG1pbiJ9.KoF_67GFqhGwaTu0a5f-7VBl0H6LfGi-5DI7CzCFjj6YtXnNJv7j4SfrGLr5NjPtOJqOLOWMZ_Rj4y0MhH0NWPNL0_5qOUfGGNFwBbSSHKG5KEJLsVMGHJQ8HUpCUW0--TRB7LqDLmKg74WQNZ1N6Qbh9XlrCQtXnEGqOQFGqGEi3B0j_dAfMVZRoN_vu3NkC3FiR0qTbgF9Xqo8cKoG5Vaz4rnJKLJnx6S6v5rJPLOWZ9qT1Qj0Y4nP4HdZ5vKmU7Ni8q6G6LJ4Y6WqKSLVHJKFzSJZKcFSPqgM4t7p8aYFFG5qQJKL8nJFvGmO3gKLGF5qJH6bGGGh8Q-Q0Tig';

console.log('🔍 JWT Token Decoder');
console.log('==================');

try {
  // Decode without verification to see the content
  const decoded = jwt.decode(token, { complete: true });
  
  if (!decoded) {
    console.log('❌ Invalid token format');
    process.exit(1);
  }

  console.log('\n📋 Token Header:');
  console.log(JSON.stringify(decoded.header, null, 2));

  console.log('\n📋 Token Payload:');
  console.log(JSON.stringify(decoded.payload, null, 2));

  // Check expiration
  const exp = decoded.payload.exp;
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = exp - now;

  console.log('\n⏰ Token Timing:');
  console.log('Current time (Unix):', now);
  console.log('Expiration time (Unix):', exp);
  console.log('Time left (seconds):', timeLeft);
  
  if (timeLeft <= 0) {
    console.log('❌ Token is EXPIRED!');
  } else {
    console.log('✅ Token is still valid');
    console.log('Time left:', Math.floor(timeLeft / 60), 'minutes');
  }

  // Check if this is the right token type
  console.log('\n🎯 Token Validation:');
  console.log('Token use:', decoded.payload.token_use);
  console.log('Audience (Client ID):', decoded.payload.aud || decoded.payload.client_id);
  console.log('Issuer:', decoded.payload.iss);
  console.log('Key ID (kid):', decoded.header.kid);
  console.log('Algorithm:', decoded.header.alg);

  // Check user info
  console.log('\n👤 User Information:');
  console.log('Username:', decoded.payload.username || 'Not available');
  console.log('Email:', decoded.payload.email || 'Not available');
  console.log('Groups:', decoded.payload['cognito:groups'] || []);
  console.log('User ID (sub):', decoded.payload.sub);

} catch (error) {
  console.log('❌ Error decoding token:', error.message);
}
