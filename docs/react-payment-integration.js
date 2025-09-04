/**
 * React Frontend Integration Example for Stripe Payments
 * This file shows how to integrate with the Lambda payment endpoints
 */

// Example React component for payment processing
export const PaymentForm = () => {
  const [clientSecret, setClientSecret] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Your deployed API Gateway base URL
  const API_BASE_URL =
    "https://your-api-gateway-url.execute-api.eu-west-3.amazonaws.com";

  /**
   * Create payment intent on the server
   */
  const createPaymentIntent = async (orderData) => {
    try {
      setIsLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/create-payment-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: orderData.totalAmount, // Amount in cents
            currency: "eur",
            items: orderData.items,
            metadata: {
              customerEmail: orderData.customerEmail,
              orderId: orderData.orderId,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create payment intent");
      }

      const { clientSecret } = await response.json();
      setClientSecret(clientSecret);

      return clientSecret;
    } catch (error) {
      console.error("Error creating payment intent:", error);
      setPaymentStatus("error");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle payment confirmation with Stripe Elements
   */
  const handlePayment = async (stripe, elements) => {
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
        redirect: "if_required",
      });

      if (error) {
        console.error("Payment failed:", error);
        setPaymentStatus("failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        console.log("Payment succeeded:", paymentIntent.id);
        setPaymentStatus("succeeded");
        // Handle successful payment (redirect, show success message, etc.)
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Example order data structure
  const exampleOrderData = {
    totalAmount: 2500, // €25.00 in cents
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
    customerEmail: "customer@example.com",
    orderId: "order_12345",
  };

  return (
    <div className="payment-form">
      {/* Your Stripe Elements form here */}
      <button
        onClick={() => createPaymentIntent(exampleOrderData)}
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : "Create Payment"}
      </button>

      {paymentStatus && (
        <div className={`payment-status ${paymentStatus}`}>
          Payment Status: {paymentStatus}
        </div>
      )}
    </div>
  );
};

/**
 * Utility function to fetch payment status
 */
export const getPaymentStatus = async (paymentIntentId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/payment-intent/${paymentIntentId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch payment status");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching payment status:", error);
    throw error;
  }
};

/**
 * Example cart calculation
 */
export const calculateOrderTotal = (items) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  const tax = subtotal * 0.2; // 20% VAT for EU
  const shipping = subtotal > 50 ? 0 : 5.99; // Free shipping over €50

  const total = subtotal + tax + shipping;

  return {
    subtotal: Math.round(subtotal * 100), // Convert to cents
    tax: Math.round(tax * 100),
    shipping: Math.round(shipping * 100),
    total: Math.round(total * 100),
  };
};

// Package.json dependencies you'll need in your React app:
/*
{
  "dependencies": {
    "@stripe/stripe-js": "^2.1.0",
    "@stripe/react-stripe-js": "^2.1.0"
  }
}
*/

// Example Stripe setup in your React app:
/*
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_your_publishable_key_here');

function App() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm />
    </Elements>
  );
}
*/
