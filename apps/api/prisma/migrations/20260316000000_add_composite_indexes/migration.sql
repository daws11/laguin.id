-- Add composite indexes for worker polling (high-frequency queries)
CREATE INDEX "Order_status_generationCompletedAt_createdAt_idx" ON "Order"("status", "generationCompletedAt", "createdAt");
CREATE INDEX "Order_status_deliveryStatus_deliveryScheduledAt_idx" ON "Order"("status", "deliveryStatus", "deliveryScheduledAt");

-- Add composite index for admin order list filtering
CREATE INDEX "Order_status_deliveryStatus_themeSlug_createdAt_idx" ON "Order"("status", "deliveryStatus", "themeSlug", "createdAt");

-- Add composite index for discount usage count
CREATE INDEX "Order_discountCode_customerId_idx" ON "Order"("discountCode", "customerId");

-- Add composite index for worker reminder tick (find unconverted drafts with WhatsApp)
CREATE INDEX "OrderDraft_convertedOrderId_whatsappCapturedAt_idx" ON "OrderDraft"("convertedOrderId", "whatsappCapturedAt");

-- Remove redundant index on DiscountCode.code (already covered by unique constraint)
DROP INDEX IF EXISTS "DiscountCode_code_idx";
