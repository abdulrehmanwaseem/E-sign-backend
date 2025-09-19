import passport from "passport";
import AppleStrategy from "passport-apple";
import GoogleStrategy from "passport-google-oauth20";
import { prisma } from "./dbConnection.js";

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/v1/oauth/google/callback",
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { providerId: profile.id, provider: "google" },
              { email: profile.emails[0].value },
            ],
          },
        });

        if (user) {
          // Update provider info if user exists but doesn't have OAuth info
          if (!user.providerId || user.provider !== "google") {
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                provider: "google",
                providerId: profile.id,
                isEmailVerified: true,
              },
            });
          }
        } else {
          // Create new user
          user = await prisma.user.create({
            data: {
              email: profile.emails[0].value,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              avatar: profile.photos[0]?.value,
              provider: "google",
              providerId: profile.id,
              isEmailVerified: true,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Apple OAuth Strategy
passport.use(
  new AppleStrategy(
    {
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
      callbackURL: `${process.env.API_URL}/api/v1/oauth/apple/callback`,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, idToken, profile, done) => {
      try {
        // Apple doesn't always provide email in profile, so we need to handle it
        const email = profile.email || req.body?.user?.email;

        if (!email) {
          return done(new Error("Email is required for Apple OAuth"), null);
        }

        // Check if user already exists
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { providerId: profile.id, provider: "apple" },
              { email: email },
            ],
          },
        });

        if (user) {
          // Update provider info if user exists but doesn't have OAuth info
          if (!user.providerId || user.provider !== "apple") {
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                provider: "apple",
                providerId: profile.id,
                isEmailVerified: true,
              },
            });
          }
        } else {
          // Create new user
          user = await prisma.user.create({
            data: {
              email: email,
              firstName: profile.name?.firstName,
              lastName: profile.name?.lastName,
              provider: "apple",
              providerId: profile.id,
              isEmailVerified: true,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        provider: true,
      },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
