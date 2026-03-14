-- CreateEnum
CREATE TYPE "DiscountCodeStatus" AS ENUM ('active', 'paused');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "discountAmount" INTEGER,
ADD COLUMN "discountCode" TEXT;

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fixedAmount" INTEGER NOT NULL,
    "templateSlugs" JSONB,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxUsesPerPhone" INTEGER,
    "status" "DiscountCodeStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_status_idx" ON "DiscountCode"("status");

-- CreateIndex
CREATE INDEX "DiscountCode_code_idx" ON "DiscountCode"("code");
