import TryCatch from "express-async-handler";
import { USER_TOKEN, cookieOptions } from "../constants/options.js";
import { generateJwtToken } from "../utils/jwtUtils.js";
import {
  getClientIp,
  getDeviceInfo,
  getGeoLocation,
} from "../utils/userInfo.js";
import { prisma } from "../config/dbConnection.js";

// Utility function for OAuth callback response
const handleOAuthCallback = async (req, res, provider) => {
  if (!req.user) {
    const redirectUrl = `${process.env.CLIENT_URL}/dashboard?isError=true&provider=${provider}`;
    return res.redirect(redirectUrl);
  }

  // 🔹 Gather environment details
  const ip = getClientIp(req);
  const location = await getGeoLocation(ip);
  const device = getDeviceInfo(req);

  // 🔹 Save device + location in DB
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      device: device ? JSON.stringify(device) : req.user.device,
      locations: location
        ? {
            upsert: {
              where: { userId: req.user.id },
              create: {
                ip: location.ip,
                city: location.city,
                region: location.region,
                country: location.country,
                latitude: location.latitude,
                longitude: location.longitude,
              },
              update: {
                ip: location.ip,
                city: location.city,
                region: location.region,
                country: location.country,
                latitude: location.latitude,
                longitude: location.longitude,
              },
              where: { userId: req.user.id },
            },
          }
        : undefined,
    },
  });

  const userData = {
    id: req.user.id,
    email: req.user.email,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    avatar: req.user.avatar,
    provider: req.user.provider,
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
