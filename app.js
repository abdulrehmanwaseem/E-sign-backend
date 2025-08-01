import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import passport from "./src/config/passport.js";
import { corsOptions } from "./src/constants/options.js";
import errorMiddleware from "./src/middlewares/errorMiddleware.js";

//* Routes:
import { authRouter } from "./src/routes/auth.routes.js";
import { oauthRouter } from "./src/routes/oauth.routes.js";

//* Setup:
export const app = express();

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
