import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import cron from "node-cron";
import fetch from "node-fetch";
import { resolve } from "path";
import { corsOptions } from "./src/constants/options.js";
import errorMiddleware from "./src/middlewares/errorMiddleware.js";
import passport from "./src/config/passport.js";

//* Routes:
import { authRouter } from "./src/routes/auth.routes.js";
import { oauthRouter } from "./src/routes/oauth.routes.js";

//* Setup:
export const app = express();
const __dirname = resolve();
const rootDir = resolve(__dirname, "..");

cron.schedule("*/10 * * * *", async () => {
  try {
    const res = await fetch("https://e-sign-backend.onrender.com");
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
app.use("/api/v1/oauth", oauthRouter);

app.use(errorMiddleware);
