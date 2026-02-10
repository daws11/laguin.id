-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PromptTemplateType" AS ENUM ('lyrics', 'mood_description', 'music');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('created', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('delivery_pending', 'delivery_scheduled', 'delivered', 'delivery_failed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('free', 'pending', 'paid', 'failed');

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "openaiApiKeyEnc" TEXT,
    "kaiAiApiKeyEnc" TEXT,
    "whatsappProvider" TEXT NOT NULL DEFAULT 'mock',
    "whatsappConfig" JSONB,
    "instantEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deliveryDelayHours" INTEGER,
    "paymentsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "type" "PromptTemplateType" NOT NULL,
    "templateText" TEXT NOT NULL,
    "kaiSettings" JSONB,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsappNumber" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "inputPayload" JSONB NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'created',
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'delivery_pending',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'free',
    "lyricsText" TEXT,
    "moodDescription" TEXT,
    "trackUrl" TEXT,
    "trackMetadata" JSONB,
    "confirmedAt" TIMESTAMP(3),
    "generationStartedAt" TIMESTAMP(3),
    "generationCompletedAt" TIMESTAMP(3),
    "deliveryScheduledAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromptTemplate_type_isActive_idx" ON "PromptTemplate"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_type_version_key" ON "PromptTemplate"("type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_whatsappNumber_key" ON "Customer"("whatsappNumber");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_deliveryStatus_idx" ON "Order"("deliveryStatus");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderEvent_type_idx" ON "OrderEvent"("type");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

