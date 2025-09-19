import { Router } from "express";
import passport from "passport";
import {
  appleCallback,
  googleCallback,
} from "../controllers/oauth.controller.js";

export const oauthRouter = Router();

// Google OAuth routes
oauthRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

oauthRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
  }),
  googleCallback
);

// Apple OAuth routes
oauthRouter.get(
  "/apple",
  passport.authenticate("apple", { scope: ["email", "name"] })
);

oauthRouter.get(
  "/apple/callback",
  passport.authenticate("apple", {
    session: false,
  }),
  appleCallback
);
