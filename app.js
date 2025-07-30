import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { resolve } from "path";
import { corsOptions } from "./src/constants/options.js";
import errorMiddleware from "./src/middlewares/errorMiddleware.js";
import cron from "node-cron";
import fetch from "node-fetch";
import passport from "./src/config/passport.js";

//* Routes:
import { authRouter } from "./src/routes/auth.routes.js";
import { oAuthRouter } from "./src/routes/oauth.routes.js";

//* Setup:
export const app = express();
const __dirname = resolve();
const rootDir = resolve(__dirname, "..");

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// Replace with your deployed app's public URL
const APP_URL = "https://e-sign-backend.onrender.com/health";

cron.schedule("*/10 * * * *", async () => {
  try {
    const res = await fetch(APP_URL);
    console.log(
      `Pinged self at ${new Date().toISOString()} - Status: ${res.status}`
    );
  } catch (err) {
    console.error("Error pinging self:", err);
  }
});

app.use(cors(corsOptions));
app.use(compression());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

//* Routes:
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/oauth", oAuthRouter);

app.use(errorMiddleware);
