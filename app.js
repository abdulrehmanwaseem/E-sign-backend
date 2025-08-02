import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
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

app.use(cors(corsOptions));
app.use(compression());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

// Serve static files (uploaded documents) with CORS headers
app.use(
  "/uploads",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

//* Routes:
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/oauth", oauthRouter);
app.use("/api/v1/documents", documentRouter);

app.use(errorMiddleware);
