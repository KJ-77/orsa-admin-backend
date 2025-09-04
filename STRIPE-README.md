# Stripe Payment Integration for Orsa E-commerce

This document provides a complete overview of the Stripe payment processing integration for your Orsa olive oil e-commerce backend.

## 🚀 Quick Start

### 1. Setup Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your Stripe keys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 2. Test Locally

```bash
# Test Stripe integration
npm run test:stripe

# Start local development server
npm run offline
```

### 3. Deploy to AWS

```bash
# Deploy to development
npm run deploy

# Deploy to production
npm run deploy:prod
```

## 📋 API Endpoints

### Create Payment Intent

Creates a new payment intent for processing payments.

**Endpoint:** `POST /api/create-payment-intent`

**Request:**

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

### Stripe Webhook

Handles Stripe webhook events for payment processing.

**Endpoint:** `POST /api/webhook`

**Events Handled:**

- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `payment_intent.created` - Payment intent created

### Get Payment Status

Retrieves the current status of a payment intent.

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

## 🏗️ Architecture

```
React Frontend
    ↓
API Gateway (AWS)
    ↓
Lambda Functions
    ↓
Stripe API
```

### Lambda Functions:

- `createPaymentIntent` - Creates payment intents
- `stripeWebhook` - Handles Stripe webhooks
- `getPaymentIntent` - Retrieves payment status

## 🔧 Configuration

### Environment Variables

| Variable                | Description            | Example                        |
| ----------------------- | ---------------------- | ------------------------------ |
| `STRIPE_SECRET_KEY`     | Stripe secret key      | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | `whsec_...`                    |

### Serverless.yml Configuration

The payment functions are configured in `serverless.yml` with:

- CORS enabled for frontend domains
- Environment variables for Stripe keys
- HTTP API Gateway endpoints
- Proper timeout settings

## 🧪 Testing

### Local Testing

```bash
# Test Stripe service functions
npm run test:stripe

# Start local development server
npm run offline
```

### Test Payment Intent Creation

```bash
curl -X POST http://localhost:3000/api/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "currency": "eur",
    "items": [{"id": 1, "name": "Test Product", "price": 25.00, "quantity": 1}]
  }'
```

### Stripe Test Cards

- **Success:** 4242424242424242
- **Decline:** 4000000000000002
- **3D Secure:** 4000002500003155

## 🔒 Security Features

### Webhook Verification

All webhooks are verified using Stripe's signature verification:

```javascript
const event = stripe.webhooks.constructEvent(
  payload,
  signature,
  endpointSecret
);
```

### Input Validation

- Amount validation (minimum 50 cents)
- Currency validation
- Required field validation
- Type checking

### Error Handling

- No sensitive information exposed in error messages
- Proper HTTP status codes
- Detailed logging for debugging

## 🔄 Frontend Integration

### React Setup

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

### Payment Flow

1. Frontend creates payment intent via API
2. Stripe Elements collects payment details
3. Payment is confirmed with Stripe
4. Webhook notifies backend of success/failure
5. Backend processes order completion

## 📊 Monitoring

### AWS CloudWatch

Monitor Lambda functions for:

- Execution duration
- Error rates
- Memory usage
- Request volume

### Stripe Dashboard

Track payments:

- Successful transactions
- Failed payments
- Webhook delivery status
- Revenue metrics

### Logging Commands

```bash
# Monitor payment creation logs
npm run logs:payment

# Monitor webhook logs
npm run logs:webhook
```

## 🚀 Deployment

### Development

```bash
npm run deploy
```

### Production

```bash
# Set production environment variables
export STRIPE_SECRET_KEY="sk_live_your_live_key"
export STRIPE_WEBHOOK_SECRET="whsec_your_live_webhook_secret"

# Deploy to production
npm run deploy:prod
```

### Post-Deployment

1. Update webhook endpoint URL in Stripe Dashboard
2. Test with real payment methods
3. Update frontend API URLs
4. Monitor CloudWatch logs

## 🛠️ File Structure

```
├── stripeService.js          # Stripe API integration
├── handler.js                # Lambda function handlers
├── serverless.yml            # Serverless configuration
├── test-stripe.js            # Test script
├── .env.example              # Environment variables template
├── docs/
│   ├── stripe-deployment-guide.md
│   └── react-payment-integration.js
```

## 🔧 Troubleshooting

### Common Issues

**CORS Errors**

- Check `allowedOrigins` in `serverless.yml`
- Verify frontend domain is included

**Webhook Signature Verification Fails**

- Ensure webhook secret is correct
- Check that raw body is passed to verification

**Payment Creation Fails**

- Verify Stripe secret key
- Check amount is >= 50 cents
- Validate currency code

### Debug Commands

```bash
# Check specific function logs
serverless logs -f createPaymentIntent --tail

# Test function locally
serverless invoke local -f createPaymentIntent --data '{"body": "{\"amount\": 1000}"}'
```

## 📚 Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe React Integration](https://stripe.com/docs/stripe-js/react)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Serverless Framework Documentation](https://www.serverless.com/framework/docs/)

## 🤝 Support

For issues and questions:

1. Check AWS CloudWatch logs
2. Review Stripe Dashboard webhook logs
3. Test with Stripe test environment first
4. Review error messages in browser console
