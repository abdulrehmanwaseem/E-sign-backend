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
    // Only monthly plan available
    const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

    if (!priceId) {
      throw new ApiError("Monthly price ID not configured", 500);
    }

    // Create or get customer
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    let customerId = user.stripeCustomerId;

    console.log("USER: ", user, user?.id);

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:
          user.firstName || user.lastName
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
            : "Not Provided",
        metadata: { userId: user.id.toString() },
      });
      customerId = customer.id;

      // Save customer ID to user
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      customer: customerId,
      success_url: `${process.env.CLIENT_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard?payment=cancel`,
      metadata: {
        userId: user.id.toString(),
        planType: "monthly",
      },
    });

    res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error("Stripe session error:", error);
    throw new ApiError("Failed to create Stripe session", 500);
  }
});

// @desc    Stripe webhook to handle payment events
// @route   POST /api/v1/payment/webhook
// @access  Public
export const stripeWebhook = asyncHandler(async (req, res) => {
  let event;
  try {
    const sig = req.headers["stripe-signature"];
    if (!Buffer.isBuffer(req.body)) {
      throw new Error(
        "Webhook payload must be a Buffer. Check express.raw() middleware."
      );
    }
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

  try {
    // Handle subscription activation
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const email = session.customer_email || session.customer_details?.email;

      if (!email) {
        console.error("❌ No email found in session for PRO upgrade.");
        return res
          .status(400)
          .json({ error: "Missing customer email in session" });
      }

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription
      );

      console.log("Subscription details:", subscription);
      await prisma.user.update({
        where: { email },
        data: {
          userType: "PRO",
          stripeCustomerId: session.customer,
          subscriptionStatus: subscription.status || "active",
          currentPeriodEnd: thirtyDaysFromNow,
        },
      });
      console.log(`✅ User ${userId} upgraded to PRO`);
    }

    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      await prisma.user.updateMany({
        where: { stripeCustomerId: subscription.customer },
        data: {
          userType: "FREE",
          subscriptionStatus: "canceled",
        },
      });
      console.log(`✅ User downgraded to FREE`);
    }

    // Handle subscription updates (renewals, etc.)
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      const updateData = {
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      };

      // Keep as PRO if active, downgrade if canceled
      if (subscription.status === "active") {
        updateData.userType = "PRO";
      } else if (subscription.status === "canceled") {
        updateData.userType = "FREE";
      } else if (subscription.status === "past_due") {
        updateData.userType = "PRO";
      } else if (subscription.status === "unpaid") {
        updateData.userType = "FREE";
      } else if (subscription.status === "incomplete") {
        updateData.userType = "FREE";
      }

      await prisma.user.updateMany({
        where: { stripeCustomerId: subscription.customer },
        data: updateData,
      });
      console.log(`✅ Subscription updated - status: ${subscription.status}`);
    }
  } catch (error) {
    console.error(`❌ Webhook handler failed:`, error);
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  res.status(200).json({ received: true });
});

// @desc    Get subscription details
// @route   GET /api/v1/payment/subscription
// @access  Privatea
export const getSubscriptionDetails = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      userType: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      stripeCustomerId: true,
    },
  });

  res.status(200).json({
    success: true,
    subscription: {
      isPro: user.userType === "PRO",
      status: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      isActive: user.userType === "PRO" && user.subscriptionStatus === "active",
    },
  });
});

// @desc    Cancel Stripe subscription
// @route   POST /api/v1/payment/cancel-subscription
// @access  Private
export const cancelProSubscription = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user.stripeCustomerId) {
    throw new ApiError("No Stripe customer found for user", 404);
  }

  // Find active subscription
  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "active",
    limit: 1,
  });

  if (!subscriptions.data.length) {
    throw new ApiError("No active subscription found", 404);
  }

  // Cancel at period end (don't immediately cancel)
  await stripe.subscriptions.update(subscriptions.data[0].id, {
    cancel_at_period_end: true,
  });

  res.status(200).json({
    success: true,
    message: "Subscription will be canceled at the end of the billing period.",
  });
});

// @desc    Create customer portal session
// @route   POST /api/v1/payment/customer-portal
// @access  Private
export const createCustomerPortalSession = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!user.stripeCustomerId) {
    throw new ApiError("No Stripe customer found", 404);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.CLIENT_URL}/dashboard/billing`,
  });

  res.status(200).json({
    success: true,
    url: session.url,
  });
});
