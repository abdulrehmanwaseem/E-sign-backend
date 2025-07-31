import TryCatch from "express-async-handler";
import { USER_TOKEN, cookieOptions } from "../constants/options.js";
import { generateJwtToken } from "../utils/jwtUtils.js";

// Google OAuth callback handler
const googleCallback = TryCatch(async (req, res, next) => {
  if (req.user) {
    const userData = {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      avatar: req.user.avatar,
      provider: req.user.provider,
    };

    const token = generateJwtToken(userData);

    // Set cookie
    res.cookie(USER_TOKEN, token, cookieOptions);

    // Redirect to client with success message
    const redirectUrl = `${process.env.CLIENT_URL}/dashboard`;
    res.redirect(redirectUrl);
  } else {
    // Redirect to client with error
    const redirectUrl = `${process.env.CLIENT_URL}/dashboard?isError=false`;
    res.redirect(redirectUrl);
  }
});

// Apple OAuth callback handler
const appleCallback = TryCatch(async (req, res, next) => {
  if (req.user) {
    const userData = {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      avatar: req.user.avatar,
      provider: req.user.provider,
    };

    const token = generateJwtToken(userData);

    // Set cookie
    res.cookie(USER_TOKEN, token, cookieOptions);

    // Redirect to client with success message
    const redirectUrl = `${process.env.CLIENT_URL}/dashboard`;
    res.redirect(redirectUrl);
  } else {
    // Redirect to client with error
    const redirectUrl = `${process.env.CLIENT_URL}/dashboard?isError=true`;
    res.redirect(redirectUrl);
  }
});

export { googleCallback, appleCallback };
