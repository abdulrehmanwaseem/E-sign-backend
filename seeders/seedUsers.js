import { PrismaClient } from "@prisma/client";
import { extractNameFromEmail } from "../src/utils/helpers.js";
const prisma = new PrismaClient();

const avatarUrl = (email) =>
  `https://avatar.iran.liara.run/username?username=${extractNameFromEmail(
    email
  )}`;

async function main() {
  await prisma.user.createMany({
    data: [
      {
        email: "freeuser1@example.com",
        avatar: avatarUrl("freeuser1@example.com"),
        password: "hashedpassword1",
        firstName: "Alice",
        lastName: "Free",
        userType: "FREE",
        role: "USER",
        isEmailVerified: true,
        phone: "1234567890",
        isPhoneVerified: true,
        provider: "credentials",
        providerId: null,
        device: JSON.stringify({
          os: "Windows",
          browser: "Chrome",
          ip: "192.168.1.10",
        }),
      },
      {
        email: "prouser1@example.com",
        avatar: avatarUrl("prouser1@example.com"),
        password: "hashedpassword2",
        firstName: "Bob",
        lastName: "Pro",
        userType: "PRO",
        role: "USER",
        isEmailVerified: true,
        phone: "2345678901",
        isPhoneVerified: true,
        provider: "google",
        providerId: "google-oauth-id-123",
        device: JSON.stringify({
          os: "Mac",
          browser: "Safari",
          ip: "192.168.1.20",
        }),
      },
      {
        email: "admin@example.com",
        avatar: avatarUrl("admin@example.com"),
        password: "hashedpassword3",
        firstName: "Admin",
        lastName: "User",
        userType: "PRO",
        role: "ADMIN",
        isEmailVerified: true,
        phone: "3456789012",
        isPhoneVerified: true,
        provider: "apple",
        providerId: "apple-oauth-id-456",
        device: JSON.stringify({
          os: "Mac",
          browser: "Safari",
          ip: "192.168.1.30",
        }),
      },
      // New users with diverse locations
      {
        email: "maria.garcia@example.com",
        avatar: avatarUrl("maria.garcia@example.com"),
        password: "hashedpassword4",
        firstName: "Maria",
        lastName: "Garcia",
        userType: "FREE",
        role: "USER",
        isEmailVerified: true,
        phone: "34912345678",
        isPhoneVerified: true,
        provider: "credentials",
        providerId: null,
        device: JSON.stringify({
          os: "Windows",
          browser: "Chrome",
          ip: "85.84.162.45",
        }),
      },
      {
        email: "hiroshi.tanaka@example.com",
        avatar: avatarUrl("hiroshi.tanaka@example.com"),
        password: "hashedpassword5",
        firstName: "Hiroshi",
        lastName: "Tanaka",
        userType: "PRO",
        role: "USER",
        isEmailVerified: true,
        phone: "81312345678",
        isPhoneVerified: false,
        provider: "google",
        providerId: "google-oauth-id-789",
        device: JSON.stringify({
          os: "iOS",
          browser: "Safari",
          ip: "202.214.86.123",
        }),
      },
      {
        email: "sarah.mitchell@example.com",
        avatar: avatarUrl("sarah.mitchell@example.com"),
        password: "hashedpassword6",
        firstName: "Sarah",
        lastName: "Mitchell",
        userType: "FREE",
        role: "USER",
        isEmailVerified: false,
        phone: "61412345678",
        isPhoneVerified: true,
        provider: "facebook",
        providerId: "facebook-oauth-id-101",
        device: JSON.stringify({
          os: "Windows",
          browser: "Chrome",
          ip: "203.214.52.88",
        }),
      },
      {
        email: "ahmed.hassan@example.com",
        avatar: avatarUrl("ahmed.hassan@example.com"),
        password: "hashedpassword7",
        firstName: "Ahmed",
        lastName: "Hassan",
        userType: "PRO",
        role: "USER",
        isEmailVerified: true,
        phone: "971501234567",
        isPhoneVerified: true,
        provider: "credentials",
        providerId: null,
        device: JSON.stringify({
          os: "Mac",
          browser: "Safari",
          ip: "5.62.61.5",
        }),
      },
      {
        email: "priya.sharma@example.com",
        avatar: avatarUrl("priya.sharma@example.com"),
        password: "hashedpassword8",
        firstName: "Priya",
        lastName: "Sharma",
        userType: "FREE",
        role: "USER",
        isEmailVerified: true,
        phone: "919876543210",
        isPhoneVerified: true,
        provider: "apple",
        providerId: "apple-oauth-id-789",
        device: JSON.stringify({
          os: "iOS",
          browser: "Safari",
          ip: "117.201.45.123",
        }),
      },
    ],
    skipDuplicates: true,
  });

  // Seed locations for each user with diverse geographic data
  const users = await prisma.user.findMany({});

  // Location mapping for different users based on their IP addresses
  const locationData = {
    "192.168.1.10": {
      city: "New York",
      region: "New York",
      country: "United States",
      latitude: 40.7128,
      longitude: -74.006,
    },
    "192.168.1.20": {
      city: "San Francisco",
      region: "California",
      country: "United States",
      latitude: 37.7749,
      longitude: -122.4194,
    },
    "192.168.1.30": {
      city: "Seattle",
      region: "Washington",
      country: "United States",
      latitude: 47.6062,
      longitude: -122.3321,
    },
    "85.84.162.45": {
      city: "Madrid",
      region: "Madrid",
      country: "Spain",
      latitude: 40.4168,
      longitude: -3.7038,
    },
    "202.214.86.123": {
      city: "Tokyo",
      region: "Tokyo",
      country: "Japan",
      latitude: 35.6762,
      longitude: 139.6503,
    },
    "203.214.52.88": {
      city: "Sydney",
      region: "New South Wales",
      country: "Australia",
      latitude: -33.8688,
      longitude: 151.2093,
    },
    "5.62.61.5": {
      city: "Dubai",
      region: "Dubai",
      country: "United Arab Emirates",
      latitude: 25.2048,
      longitude: 55.2708,
    },
    "117.201.45.123": {
      city: "Mumbai",
      region: "Maharashtra",
      country: "India",
      latitude: 19.076,
      longitude: 72.8777,
    },
  };

  for (const user of users) {
    const userDevice = user.device ? JSON.parse(user.device) : null;
    const userIp = userDevice?.ip || "127.0.0.1";
    const location = locationData[userIp] || {
      city: "Unknown City",
      region: "Unknown Region",
      country: "Unknown Country",
      latitude: 0.0,
      longitude: 0.0,
    };

    // Check if location already exists for this user
    const existingLocation = await prisma.userLocation.findUnique({
      where: { userId: user.id },
    });

    if (!existingLocation) {
      await prisma.userLocation.create({
        data: {
          userId: user.id,
          ip: userIp,
          city: location.city,
          region: location.region,
          country: location.country,
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });
    } else {
      // Optionally update existing location
      await prisma.userLocation.update({
        where: { userId: user.id },
        data: {
          ip: userIp,
          city: location.city,
          region: location.region,
          country: location.country,
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });
    }
  }

  console.log("✅ Database seeded successfully!");
  console.log(`📊 Total users created: ${users.length}`);
  console.log("🌍 Users from different countries:");
  console.log("   - United States (3 users)");
  console.log("   - Spain (1 user)");
  console.log("   - Japan (1 user)");
  console.log("   - Australia (1 user)");
  console.log("   - UAE (1 user)");
  console.log("   - India (1 user)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
