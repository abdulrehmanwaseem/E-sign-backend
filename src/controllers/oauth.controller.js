import TryCatch from "express-async-handler";
import { USER_TOKEN, cookieOptions } from "../constants/options.js";
import { generateJwtToken } from "../utils/jwtUtils.js";

// Utility function for OAuth callback response
const handleOAuthCallback = (req, res, provider) => {
  if (!req.user) {
    const redirectUrl = `${process.env.CLIENT_URL}/dashboard?isError=true&provider=${provider}`;
    return res.redirect(redirectUrl);
  }

  const userData = {
    id: req.user.id,
    email: req.user.email,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    avatar: req.user.avatar,
    provider: req.user.provider,
    device: "DESKTOP",
  };

  const token = generateJwtToken(userData);

  // Attach token in cookie
  res.cookie(USER_TOKEN, token, cookieOptions);

  // Redirect to dashboard
  const redirectUrl = `${process.env.CLIENT_URL}/dashboard?provider=${provider}&isError=false`;
  return res.redirect(redirectUrl);
};

// Google OAuth callback
const googleCallback = TryCatch(async (req, res, next) => {
  handleOAuthCallback(req, res, "google");
});

// Apple OAuth callback
const appleCallback = TryCatch(async (req, res, next) => {
  handleOAuthCallback(req, res, "apple");
});

export { googleCallback, appleCallback };
