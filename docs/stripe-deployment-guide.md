# Stripe Payment Integration - Deployment Guide

## Overview

This guide explains how to deploy and configure the Stripe payment processing Lambda functions for your Orsa olive oil e-commerce site.

## Prerequisites

1. Stripe account (test and live mode)
2. AWS account with configured credentials
3. Serverless Framework installed
4. Node.js environment

## 1. Environment Variables Setup

### For AWS Lambda (Production)

Set these environment variables in your AWS Lambda console or through serverless.yml:

```bash
STRIPE_SECRET_KEY=sk_live_your_actual_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret
```

### For Local Development

1. Copy `.env.example` to `.env`
2. Fill in your Stripe test keys:

```bash
STRIPE_SECRET_KEY=sk_test_your_test_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret
```

## 2. Stripe Dashboard Configuration

### 2.1 Get Your API Keys

1. Login to your Stripe Dashboard
2. Go to Developers > API Keys
3. Copy your Secret Key (starts with `sk_test_` or `sk_live_`)
4. Copy your Publishable Key (starts with `pk_test_` or `pk_live_`)

### 2.2 Configure Webhooks

1. Go to Developers > Webhooks in Stripe Dashboard
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-api-gateway-url/api/webhook`
4. Select these events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.created`
5. Copy the webhook signing secret (starts with `whsec_`)

## 3. Deployment Steps

### 3.1 Install Dependencies

```bash
cd orsa-admin-backend
npm install
```

### 3.2 Configure Environment Variables

```bash
# For Windows PowerShell
$env:STRIPE_SECRET_KEY="sk_test_your_key_here"
$env:STRIPE_WEBHOOK_SECRET="whsec_your_secret_here"

# For Linux/Mac
export STRIPE_SECRET_KEY="sk_test_your_key_here"
export STRIPE_WEBHOOK_SECRET="whsec_your_secret_here"
```

### 3.3 Deploy to AWS

```bash
# Deploy to development
npm run deploy

# Deploy to production
npm run deploy:prod
```

### 3.4 Get Your API Gateway URL

After deployment, Serverless will output your API Gateway URL. It will look like:

```
https://xxxxxxxxxx.execute-api.eu-west-3.amazonaws.com
```

## 4. API Endpoints

### 4.1 Create Payment Intent

**Endpoint:** `POST /api/create-payment-intent`

**Request Body:**

```json
{
  "amount": 2500,
  "currency": "eur",
  "items": [
    {
      "id": 1,
      "name": "Premium Olive Oil",
      "price": 15.99,
      "quantity": 1
    }
  ],
  "metadata": {
    "customerEmail": "customer@example.com",
    "orderId": "order_12345"
  }
}
```

**Response:**

```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

### 4.2 Stripe Webhook

**Endpoint:** `POST /api/webhook`

- Used by Stripe to notify your backend of payment events
- Automatically verifies webhook signatures
- Handles payment success/failure events

### 4.3 Get Payment Status

**Endpoint:** `GET /api/payment-intent/{paymentIntentId}`

**Response:**

```json
{
  "id": "pi_xxx",
  "amount": 2500,
  "currency": "eur",
  "status": "succeeded",
  "metadata": {...},
  "created": 1645123456
}
```

## 5. React Frontend Integration

### 5.1 Install Stripe Dependencies

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 5.2 Basic Setup

```javascript
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_test_your_publishable_key");

function App() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm />
    </Elements>
  );
}
```

### 5.3 Environment Variables for React

Create a `.env` file in your React project:

```bash
REACT_APP_API_BASE_URL=https://your-api-gateway-url.execute-api.eu-west-3.amazonaws.com
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

## 6. Testing

### 6.1 Test Payment Intent Creation

```bash
curl -X POST https://your-api-url/api/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "currency": "eur",
    "items": [{"id": 1, "name": "Test Product", "price": 25.00, "quantity": 1}]
  }'
```

### 6.2 Test Cards (Stripe Test Mode)

- Success: `4242424242424242`
- Decline: `4000000000000002`
- 3D Secure: `4000002500003155`

### 6.3 Webhook Testing

Use Stripe CLI to test webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhook
stripe trigger payment_intent.succeeded
```

## 7. Security Checklist

- ✅ Use environment variables for all sensitive data
- ✅ Verify webhook signatures
- ✅ Use HTTPS for all endpoints
- ✅ Validate all input data
- ✅ Don't expose sensitive information in error messages
- ✅ Use different keys for test and live environments
- ✅ Set up proper CORS for your domain only

## 8. Monitoring and Logs

### 8.1 AWS CloudWatch

Monitor your Lambda functions in AWS CloudWatch:

- Function duration
- Error rates
- Memory usage

### 8.2 Stripe Dashboard

Monitor payments in Stripe Dashboard:

- Successful payments
- Failed payments
- Webhook delivery status

## 9. Going Live

### 9.1 Switch to Live Mode

1. Replace test keys with live keys
2. Update webhook endpoints to live environment
3. Test with real payment methods
4. Update frontend to use live publishable key

### 9.2 Production Checklist

- ✅ Live Stripe keys configured
- ✅ Webhook endpoints updated
- ✅ SSL certificate verified
- ✅ Error monitoring set up
- ✅ Backup and recovery plan
- ✅ Customer support process

## 10. Troubleshooting

### Common Issues:

1. **Webhook signature verification fails**

   - Check webhook secret is correct
   - Ensure raw body is passed to verification

2. **CORS errors**

   - Verify allowed origins in serverless.yml
   - Check preflight OPTIONS requests

3. **Payment intent creation fails**
   - Verify Stripe secret key
   - Check amount is >= 50 cents
   - Validate currency code

### Debug Commands:

```bash
# Check Lambda logs
serverless logs -f createPaymentIntent --tail

# Test connection
serverless invoke -f createPaymentIntent --data '{"body": "{\"amount\": 1000}"}'
```

## Support

For issues:

1. Check AWS CloudWatch logs
2. Check Stripe Dashboard for webhook delivery
3. Review error messages in browser console
4. Test with Stripe test cards first
