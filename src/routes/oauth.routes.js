import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { USER_TOKEN, cookieOptions } from "../constants/options.js";

export const oAuthRouter = Router();

// Google OAuth Routes
oAuthRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

oAuthRouter.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign(
      { id: user.id, email: user.email, provider: user.provider },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.cookie(USER_TOKEN, token, cookieOptions);

    // Redirect to a callback page that will close popup and update parent
    res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?success=true&provider=google`
    );
  }
);

// Apple OAuth Routes
oAuthRouter.get(
  "/apple",
  passport.authenticate("apple", { scope: ["name", "email"] })
);

oAuthRouter.get(
  "/apple/callback",
  passport.authenticate("apple", { session: false }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign(
      { id: user.id, email: user.email, provider: user.provider },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.cookie(USER_TOKEN, token, cookieOptions);

    // Redirect to a callback page that will close popup and update parent
    res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?success=true&provider=apple`
    );
  }
);

// OAuth Status Check
oAuthRouter.get("/status", (req, res) => {
  res.json({
    status: "success",
    message: "OAuth routes are working",
    providers: {
      google: {
        enabled: !!process.env.GOOGLE_CLIENT_ID,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL,
      },
      apple: {
        enabled: !!process.env.APPLE_CLIENT_ID,
        callbackUrl: process.env.APPLE_CALLBACK_URL,
      },
    },
  });
});
