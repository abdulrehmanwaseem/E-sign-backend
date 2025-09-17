/*
  Warnings:

  - You are about to drop the column `customMessage` on the `DocumentRecipient` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "customRecipientMessage" TEXT;

-- AlterTable
ALTER TABLE "public"."DocumentRecipient" DROP COLUMN "customMessage";

-- AlterTable
ALTER TABLE "public"."SignatureField" ADD COLUMN     "font" TEXT DEFAULT 'signature';
