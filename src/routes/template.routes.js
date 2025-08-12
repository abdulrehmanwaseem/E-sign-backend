import express from "express";

import isAuthenticated from "../middlewares/isAuthenticated.js";
import { singleFile } from "../middlewares/multerMiddleware.js";

export const templateRouter = express.Router();
