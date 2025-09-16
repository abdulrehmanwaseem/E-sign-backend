const cookieExpiresIn = process.env.COOKIE_EXPIRES_IN || "10d";

const cookieOptions = {
  maxAge: parseInt(cookieExpiresIn) * 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};

const corsOptions = {
  origin: process.env.CLIENT_URL,
  credentials: true,
};

const USER_TOKEN = "user_token";

export { cookieOptions, corsOptions, USER_TOKEN };
