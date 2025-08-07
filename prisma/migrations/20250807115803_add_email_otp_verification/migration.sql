-- AlterEnum
ALTER TYPE "public"."ActivityAction" ADD VALUE 'DOWNLOADED';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otpExpires" TIMESTAMP(3);
