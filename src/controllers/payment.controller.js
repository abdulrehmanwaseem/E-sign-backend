import Stripe from "stripe";
import asyncHandler from "express-async-handler";
import { ApiError } from "../utils/ApiError.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create Stripe Checkout session for $9.98 plan
// @route   POST /api/payment/create-session
// @access  Private
export const createStripeSession = asyncHandler(async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Signature Pro",
            },
            unit_amount: 998, // $9.98 in cents (9.98 * 100)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard?payment=cancel`,
      customer_email: req.user.email,
    });
    res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error("Stripe session error:", error);
    throw new ApiError("Failed to create Stripe session", 500);
  }
});
