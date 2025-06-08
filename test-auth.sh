#!/bin/bash

# Test Authentication with cURL
# Replace these values with your actual API URL and tokens

API_URL="https://your-api-id.execute-api.eu-west-3.amazonaws.com"
USER_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
ADMIN_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

echo "🔐 Testing Authentication Endpoints"
echo "=================================="

echo -e "\n1. Testing user token validation:"
curl -X GET "${API_URL}/auth/validate" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

echo -e "\n2. Testing admin token validation:"
curl -X GET "${API_URL}/auth/validate-admin" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

echo -e "\n3. Testing user token on admin endpoint (should fail):"
curl -X GET "${API_URL}/auth/validate-admin" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

echo -e "\n4. Testing without authentication (should fail):"
curl -X GET "${API_URL}/auth/validate" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

echo -e "\n5. Testing protected products endpoint:"
curl -X GET "${API_URL}/products" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

echo "✅ Authentication tests completed!"
