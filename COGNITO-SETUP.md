# AWS Cognito Authentication Setup Guide

This guide will help you set up AWS Cognito authentication for your Orsa Admin backend API.

## Overview

The authentication system provides:

- **JWT token validation** for all API endpoints
- **Role-based access control** (Admin vs Regular users)
- **User registration and sign-in** via AWS Cognito
- **Automatic token refresh** handling
- **CORS support** for frontend integration

## Quick Setup

### Step 1: Configure AWS Credentials

Ensure you have AWS CLI configured with appropriate permissions:

```bash
aws configure
```

Or set environment variables:

```bash
set AWS_ACCESS_KEY_ID=your-access-key
set AWS_SECRET_ACCESS_KEY=your-secret-key
set AWS_DEFAULT_REGION=eu-west-3
```

### Step 2: Create Cognito User Pool

Run the automated setup script:

```bash
node setup-cognito.js
```

This will create:

- Cognito User Pool with email-based authentication
- App Client for your frontend
- Admin and Users groups
- Proper password policies

### Step 3: Update Environment Variables

Copy the output from the setup script to your `.env` file:

```bash
cp .env.example .env
```

Update `.env` with your Cognito settings:

```
COGNITO_USER_POOL_ID=eu-west-3_XXXXXXXXX
COGNITO_CLIENT_ID=1234567890abcdefghijklmnop
AWS_REGION=eu-west-3
STAGE=dev
```

### Step 4: Deploy Backend

Deploy your protected API:

```bash
npm run deploy
```

### Step 5: Create Admin User

1. Go to AWS Console → Cognito User Pools
2. Select your user pool
3. Go to "Users" tab
4. Click "Create user"
5. Set username/email and temporary password
6. Go to "Groups" tab
7. Add the user to the "admin" group

## API Authentication

### Protected Endpoints

All API endpoints now require authentication except:

- `GET /test-connection` (dev only)

### Authorization Levels

**Admin Only:**

- All User management endpoints (`/users/*`)
- Product management (`POST/PUT/DELETE /products/*`)
- Order management (`DELETE /orders/*`, `GET /orders/total-price`)
- Image management (`POST/PUT/DELETE /products/images/*`)

**Authenticated Users:**

- View products (`GET /products/*`)
- View product images (`GET /products/*/images`)
- Manage their own orders (`GET/POST/PUT /orders/*`)
- Add/remove items from their orders

### Making Authenticated Requests

Include the JWT token in the Authorization header:

```javascript
const response = await fetch("/api/products", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
});
```

### Error Responses

**401 Unauthorized:**

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**403 Forbidden:**

```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

## Frontend Integration

### Next.js Setup

Install AWS Amplify Auth:

```bash
npm install @aws-amplify/auth @aws-amplify/core
```

Configure Amplify:

```javascript
// lib/auth.js
import { Amplify } from "@aws-amplify/core";
import { Auth } from "@aws-amplify/auth";

Amplify.configure({
  Auth: {
    region: "eu-west-3",
    userPoolId: "eu-west-3_XXXXXXXXX",
    userPoolWebClientId: "1234567890abcdefghijklmnop",
  },
});

export { Auth };
```

### Authentication Context

```javascript
// context/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { Auth } from "../lib/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  async function checkAuthState() {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  const value = {
    user,
    loading,
    signIn: async (email, password) => {
      const result = await Auth.signIn(email, password);
      setUser(result);
      return result;
    },
    signOut: async () => {
      await Auth.signOut();
      setUser(null);
    },
    getToken: async () => {
      const session = await Auth.currentSession();
      return session.getAccessToken().getJwtToken();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

### Protected Route Component

```javascript
// components/ProtectedRoute.js
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }

    if (!loading && user && requireAdmin) {
      const groups =
        user.signInUserSession?.accessToken?.payload["cognito:groups"] || [];
      if (!groups.includes("admin")) {
        router.push("/unauthorized");
      }
    }
  }, [user, loading, router, requireAdmin]);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  if (requireAdmin) {
    const groups =
      user.signInUserSession?.accessToken?.payload["cognito:groups"] || [];
    if (!groups.includes("admin")) return null;
  }

  return children;
}
```

### API Helper

```javascript
// lib/api.js
import { Auth } from "./auth";

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    // Get current user token
    let token = null;
    try {
      const session = await Auth.currentSession();
      token = session.getAccessToken().getJwtToken();
    } catch (error) {
      console.warn("No authenticated user");
    }

    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "API request failed");
    }

    return response.json();
  }

  // Convenience methods
  get(endpoint) {
    return this.request(endpoint);
  }
  post(endpoint, data) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
  put(endpoint, data) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient(process.env.NEXT_PUBLIC_API_URL);
```

## Testing Authentication

### Test with curl

Get a token (you'll need to implement a simple token endpoint or get it from your frontend):

```bash
# Test protected endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://your-api-gateway-url.execute-api.eu-west-3.amazonaws.com/products
```

### Test User Scenarios

1. **Admin User:**

   - Can access all endpoints
   - Can create/modify products, users, orders
   - Can view business metrics

2. **Regular User:**
   - Can view products and images
   - Can manage their own orders only
   - Cannot access admin endpoints

## Troubleshooting

### Common Issues

1. **"Cognito configuration missing"**

   - Check your environment variables are set correctly
   - Ensure COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID are in .env

2. **"Token verification failed"**

   - Check the token is valid and not expired
   - Verify the User Pool ID and Client ID are correct
   - Check AWS region matches

3. **"Access denied"**

   - Check user is in the correct group (admin/users)
   - Verify JWT token contains the required claims

4. **CORS errors**
   - Verify your frontend domain is in the CORS allowedOrigins
   - Check the Authorization header is included in allowedHeaders

### Debug Logs

Enable debug logging in development:

```bash
set DEBUG=cognito:*
npm run deploy
```

Check CloudWatch logs for detailed authentication information.

## Security Best Practices

1. **Token Storage:** Use secure HTTP-only cookies or secure storage
2. **HTTPS Only:** Always use HTTPS in production
3. **Token Expiry:** Tokens expire after 1 hour by default
4. **Refresh Tokens:** Implement automatic token refresh
5. **Rate Limiting:** Consider adding rate limiting to prevent abuse
6. **Monitoring:** Monitor failed authentication attempts

## Next Steps

1. Set up your frontend authentication
2. Create user registration/login pages
3. Implement password reset functionality
4. Add MFA for enhanced security
5. Set up monitoring and alerts
