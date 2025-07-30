import { body, validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

const validateHandler = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((error) => error.msg)
      .join(", ");

    return next(new ApiError(errorMessages, 400));
  }
  return next();
};

const registerValidator = () => [
  body("email").isString().notEmpty().withMessage("Please Enter Email"),
  body("password")
    .isString()
    .notEmpty()
    .withMessage("Please Enter Password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

const loginValidator = () => [
  body("email").isString().notEmpty().withMessage("Please Enter Email"),
  body("password").isString().notEmpty().withMessage("Please Enter Password"),
];

export { loginValidator, registerValidator, validateHandler };
