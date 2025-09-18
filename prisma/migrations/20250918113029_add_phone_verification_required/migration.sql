-- AlterTable
ALTER TABLE "public"."DocumentRecipient" ADD COLUMN     "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneOtp" TEXT,
ADD COLUMN     "phoneOtpExpires" TIMESTAMP(3),
ADD COLUMN     "phoneVerificationRequired" BOOLEAN NOT NULL DEFAULT false;
