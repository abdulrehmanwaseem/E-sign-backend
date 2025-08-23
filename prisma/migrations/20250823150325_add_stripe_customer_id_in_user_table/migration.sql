-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('SIGNED', 'PENDING', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."FieldType" AS ENUM ('SIGNATURE', 'FULLNAME', 'DATE', 'EMAIL', 'TITLE', 'ADDRESS', 'INITIALS', 'TEXT');

-- CreateEnum
CREATE TYPE "public"."ActivityAction" AS ENUM ('CREATED', 'SENT', 'VIEWED', 'SIGNED', 'COMPLETED', 'CANCELLED', 'DOWNLOADED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "provider" TEXT,
    "providerId" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "otp" TEXT,
    "otpExpires" TIMESTAMP(3),
    "phoneOtp" TEXT,
    "phoneOtpExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "userType" "public"."UserType" NOT NULL DEFAULT 'FREE',
    "device" TEXT,
    "stripeCustomerId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Blog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "image" TEXT,
    "imagePublicId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "signedAt" TIMESTAMP(3),
    "signedPdfUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "isLibraryFile" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentRecipient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "accessToken" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SignatureField" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "fieldType" "public"."FieldType" NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "xPosition" DOUBLE PRECISION NOT NULL,
    "yPosition" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "fieldValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentActivity" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "recipientId" TEXT,
    "action" "public"."ActivityAction" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "public"."User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_provider_providerId_key" ON "public"."User"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLocation_userId_key" ON "public"."UserLocation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Blog_slug_key" ON "public"."Blog"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Document_accessToken_key" ON "public"."Document"("accessToken");

-- CreateIndex
CREATE INDEX "Document_createdById_idx" ON "public"."Document"("createdById");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "public"."Document"("status");

-- CreateIndex
CREATE INDEX "Document_recipientId_idx" ON "public"."Document"("recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRecipient_accessToken_key" ON "public"."DocumentRecipient"("accessToken");

-- CreateIndex
CREATE INDEX "DocumentRecipient_email_idx" ON "public"."DocumentRecipient"("email");

-- CreateIndex
CREATE INDEX "DocumentRecipient_accessToken_idx" ON "public"."DocumentRecipient"("accessToken");

-- CreateIndex
CREATE INDEX "SignatureField_documentId_recipientId_idx" ON "public"."SignatureField"("documentId", "recipientId");

-- CreateIndex
CREATE INDEX "DocumentActivity_documentId_idx" ON "public"."DocumentActivity"("documentId");

-- AddForeignKey
ALTER TABLE "public"."UserLocation" ADD CONSTRAINT "UserLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."DocumentRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SignatureField" ADD CONSTRAINT "SignatureField_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SignatureField" ADD CONSTRAINT "SignatureField_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."DocumentRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentActivity" ADD CONSTRAINT "DocumentActivity_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
