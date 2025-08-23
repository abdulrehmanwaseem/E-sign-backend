-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" TEXT;
