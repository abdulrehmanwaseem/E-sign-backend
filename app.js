import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { resolve } from "path";
import { corsOptions } from "./src/constants/options.js";
import errorMiddleware from "./src/middlewares/errorMiddleware.js";

//* Routes:
import { authRouter } from "./src/routes/auth.routes.js";

//* Setup:
export const app = express();
const __dirname = resolve();
const rootDir = resolve(__dirname, "..");

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

app.use(cors(corsOptions));
app.use(compression());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

//* Routes:
app.use("/api/v1/auth", authRouter);

app.use(errorMiddleware);
