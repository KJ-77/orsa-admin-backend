/**
 * Test script for Stripe payment functionality
 * Run this to test your payment endpoints locally
 */

const stripeService = require("./stripeService");

// Mock environment variables for testing
process.env.STRIPE_SECRET_KEY = "sk_test_your_stripe_secret_key_here";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_your_webhook_secret_here";

/**
 * Test payment intent creation
 */
async function testCreatePaymentIntent() {
  console.log("\n=== Testing Payment Intent Creation ===");

  try {
    const testOrder = {
      amount: 2500, // €25.00 in cents
      currency: "eur",
      items: [
        {
          id: 1,
          name: "Premium Olive Oil",
          price: 15.99,
          quantity: 1,
        },
        {
          id: 2,
          name: "Organic Olives",
          price: 9.01,
          quantity: 1,
        },
      ],
      metadata: {
        customerEmail: "test@example.com",
        orderId: "test_order_123",
      },
    };

    const paymentIntent = await stripeService.createPaymentIntent(testOrder);

    console.log("✅ Payment Intent created successfully:");
    console.log("- ID:", paymentIntent.id);
    console.log("- Client Secret:", paymentIntent.client_secret);
    console.log("- Amount:", paymentIntent.amount, "cents");
    console.log("- Currency:", paymentIntent.currency);

    return paymentIntent;
  } catch (error) {
    console.error("❌ Error creating payment intent:", error.message);
    return null;
  }
}

/**
 * Test order amount calculation
 */
function testCalculateOrderAmount() {
  console.log("\n=== Testing Order Amount Calculation ===");

  try {
    const items = [
      { price: 15.99, quantity: 1 },
      { price: 9.01, quantity: 2 },
      { price: 12.5, quantity: 1 },
    ];

    const totalAmount = stripeService.calculateOrderAmount(items);
    console.log("✅ Order amount calculated successfully:");
    console.log("- Items:", items);
    console.log("- Total:", totalAmount, "cents");
    console.log("- Total in euros:", (totalAmount / 100).toFixed(2), "€");
  } catch (error) {
    console.error("❌ Error calculating order amount:", error.message);
  }
}

/**
 * Test payment intent retrieval
 */
async function testGetPaymentIntent(paymentIntentId) {
  console.log("\n=== Testing Payment Intent Retrieval ===");

  if (!paymentIntentId) {
    console.log("⚠️ No payment intent ID provided, skipping test");
    return;
  }

  try {
    const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);

    console.log("✅ Payment Intent retrieved successfully:");
    console.log("- ID:", paymentIntent.id);
    console.log("- Status:", paymentIntent.status);
    console.log("- Amount:", paymentIntent.amount);
    console.log("- Currency:", paymentIntent.currency);
  } catch (error) {
    console.error("❌ Error retrieving payment intent:", error.message);
  }
}

/**
 * Test webhook signature verification (mock)
 */
function testWebhookVerification() {
  console.log("\n=== Testing Webhook Verification ===");

  try {
    // This will fail without a real webhook payload and signature
    // but it tests that the function exists and handles errors properly

    const mockPayload = JSON.stringify({
      id: "evt_test_webhook",
      object: "event",
      data: {
        object: {
          id: "pi_test_payment_intent",
          amount: 2500,
          currency: "eur",
          status: "succeeded",
        },
      },
      type: "payment_intent.succeeded",
    });

    const mockSignature = "invalid_signature_for_testing";

    // This should throw an error
    stripeService.constructWebhookEvent(mockPayload, mockSignature);
  } catch (error) {
    console.log("✅ Webhook verification correctly rejected invalid signature");
    console.log("- Expected error:", error.message);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log("🧪 Starting Stripe Service Tests");
  console.log("=====================================");

  // Test 1: Order amount calculation
  testCalculateOrderAmount();

  // Test 2: Create payment intent
  const paymentIntent = await testCreatePaymentIntent();

  // Test 3: Retrieve payment intent (if creation succeeded)
  if (paymentIntent) {
    await testGetPaymentIntent(paymentIntent.id);
  }

  // Test 4: Webhook verification
  testWebhookVerification();

  console.log("\n🏁 Tests completed");
  console.log("=====================================");
  console.log(
    "Note: Make sure to set your actual Stripe test keys in the environment variables"
  );
  console.log("to see real API responses instead of errors.");
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testCreatePaymentIntent,
  testCalculateOrderAmount,
  testGetPaymentIntent,
  testWebhookVerification,
  runTests,
};
