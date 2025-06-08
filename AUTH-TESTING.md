# Authentication Testing Guide

## Quick Start

1. **Deploy the backend:**

   ```bash
   npm run deploy
   ```

2. **Get your API Gateway URL** from the deployment output (look for `HttpApiUrl`)

3. **Update test files** with your API URL and JWT tokens:

   - `test-auth.js` (Node.js script)
   - `test-auth.sh` (Bash script)

4. **Run tests:**

   ```bash
   # Node.js test
   node test-auth.js

   # Or bash test
   chmod +x test-auth.sh
   ./test-auth.sh
   ```

## Getting JWT Tokens

### From Frontend (Recommended)

1. Sign in to your frontend application
2. Open browser Developer Tools (F12)
3. Go to Application/Storage → Local Storage or Session Storage
4. Look for tokens with keys like:
   - `CognitoIdentityServiceProvider.***.accessToken`
   - `amplify-*-accessToken`

### From AWS CLI (Alternative)

```bash
aws cognito-idp admin-initiate-auth \
  --user-pool-id eu-west-3_hjGfLZ4ek \
  --client-id 4pd1fl9fnvs9lhq7ahsdhucpf2 \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=your-email,PASSWORD=your-password
```

## Test Endpoints

| Endpoint                   | Required Auth    | Expected Result |
| -------------------------- | ---------------- | --------------- |
| `GET /auth/validate`       | Any valid token  | 200 OK          |
| `GET /auth/validate-admin` | Admin token only | 200 OK          |
| `GET /products`            | Any valid token  | 200 OK          |
| `POST /products`           | Admin token only | 200/201 OK      |
| `GET /users`               | Admin token only | 200 OK          |

## Troubleshooting

### 401 Unauthorized

- Check token format: `Bearer <token>`
- Verify token is not expired
- Ensure User Pool ID and Client ID are correct

### 403 Forbidden

- Check user is in correct Cognito group
- Verify admin endpoints require admin group membership

### CORS Errors

- Verify your frontend domain is in serverless.yml CORS config
- Check all required headers are allowed

### Token Issues

- Tokens expire after 1 hour by default
- Use refresh tokens to get new access tokens
- Check token payload with jwt.io

## Example Success Response

```json
{
  "message": "Token is valid",
  "user": {
    "sub": "12345678-1234-1234-1234-123456789012",
    "email": "user@example.com",
    "cognito:groups": ["users"]
  },
  "isAuthenticated": true
}
```

## Example Error Response

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```
