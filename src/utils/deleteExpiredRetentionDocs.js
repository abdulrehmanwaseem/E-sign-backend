import { prisma } from "../config/dbConnection.js";

export async function deleteExpiredFreeUserDocuments() {
  // Find all FREE users
  const freeUsers = await prisma.user.findMany({
    where: { userType: "FREE" },
    select: { id: true },
  });
  const freeUserIds = freeUsers.map((u) => u.id);

  // Find documents older than 30 days for FREE users
  const expiredDocs = await prisma.document.findMany({
    where: {
      createdById: { in: freeUserIds },
      createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { id: true, name: true },
  });

  if (expiredDocs.length === 0) {
    console.log("No expired documents to delete.");
    return;
  }

  // Delete expired documents
  for (const doc of expiredDocs) {
    await prisma.document.delete({ where: { id: doc.id } });
    console.log(`Deleted expired document: ${doc.name} (${doc.id})`);
  }
}

deleteExpiredFreeUserDocuments()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
