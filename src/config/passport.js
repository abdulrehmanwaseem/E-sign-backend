import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as AppleStrategy } from "passport-apple";
import { prisma } from "./dbConnection.js";

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: profile.emails[0].value },
              { providerId: profile.id, provider: "google" },
            ],
          },
        });

        if (!user) {
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
        } else if (!user.provider) {
          // Link existing user to Google
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              provider: "google",
              providerId: profile.id,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              avatar: profile.photos[0]?.value,
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
      callbackURL: process.env.APPLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, idToken, profile, done) => {
      try {
        const { email, name } = profile;

        // Check if user already exists
        let user = await prisma.user.findFirst({
          where: {
            OR: [{ email }, { providerId: profile.id, provider: "apple" }],
          },
        });

        if (!user) {
          // Create new user
          user = await prisma.user.create({
            data: {
              email,
              firstName: name?.firstName,
              lastName: name?.lastName,
              provider: "apple",
              providerId: profile.id,
              isEmailVerified: true,
            },
          });
        } else if (!user.provider) {
          // Link existing user to Apple
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              provider: "apple",
              providerId: profile.id,
              firstName: name?.firstName,
              lastName: name?.lastName,
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

export default passport;
