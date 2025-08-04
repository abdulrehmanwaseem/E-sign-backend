import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import passport from "./src/config/passport.js";
import { corsOptions } from "./src/constants/options.js";
import errorMiddleware from "./src/middlewares/errorMiddleware.js";

// ES6 __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//* Routes:
import { authRouter } from "./src/routes/auth.routes.js";
import { oauthRouter } from "./src/routes/oauth.routes.js";
import documentRouter from "./src/routes/document.routes.js";

//* Setup:
export const app = express();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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
app.use("/api/v1/documents", documentRouter);

app.use(errorMiddleware);
