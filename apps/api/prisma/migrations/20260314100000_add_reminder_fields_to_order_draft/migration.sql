-- AlterTable
ALTER TABLE "OrderDraft" ADD COLUMN "whatsappCapturedAt" TIMESTAMP(3);
ALTER TABLE "OrderDraft" ADD COLUMN "remindersSent" JSONB;

-- CreateIndex
CREATE INDEX "OrderDraft_whatsappCapturedAt_idx" ON "OrderDraft"("whatsappCapturedAt");
