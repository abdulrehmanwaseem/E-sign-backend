import Stripe from "stripe";
import asyncHandler from "express-async-handler";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "../config/dbConnection.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create Stripe Checkout session for pro plan
// @route   POST /api/v1/payment/create-session
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
    // console.log(session);
    res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error("Stripe session error:", error);
    throw new ApiError("Failed to create Stripe session", 500);
  }
});

// @desc    Stripe webhook to handle payment success
// @route   POST /api/v1/payment/webhook
// @access  Public
export const stripeWebhook = asyncHandler(async (req, res) => {
  let event;
  try {
    // Stripe requires the raw body for signature verification
    const sig = req.headers["stripe-signature"];
    console.log(sig, req.rawBody, req.body);
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("Missing Stripe webhook secret");
    }
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  console.log(event);
  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_email;
    try {
      // Upgrade user to PRO
      await prisma.user.update({
        where: { email },
        data: { userType: "PRO" },
      });
      console.log(`User ${email} upgraded to PRO.`);
    } catch (err) {
      console.error("Failed to upgrade user:", err);
    }
  }
  res.status(200).json({ received: true });
});
