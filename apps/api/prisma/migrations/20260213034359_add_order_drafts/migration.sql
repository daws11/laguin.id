-- CreateTable
CREATE TABLE "OrderDraft" (
    "id" TEXT NOT NULL,
    "draftKey" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "relationship" TEXT,
    "formValues" JSONB NOT NULL,
    "emailLower" TEXT,
    "whatsappNumber" TEXT,
    "emailVerificationId" TEXT,
    "convertedOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderDraft_draftKey_key" ON "OrderDraft"("draftKey");

-- CreateIndex
CREATE INDEX "OrderDraft_updatedAt_idx" ON "OrderDraft"("updatedAt");

-- CreateIndex
CREATE INDEX "OrderDraft_emailLower_idx" ON "OrderDraft"("emailLower");

-- CreateIndex
CREATE INDEX "OrderDraft_whatsappNumber_idx" ON "OrderDraft"("whatsappNumber");
