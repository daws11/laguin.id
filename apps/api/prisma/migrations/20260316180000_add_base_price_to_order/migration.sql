-- AlterTable
ALTER TABLE "Order" ADD COLUMN "basePrice" INTEGER;

-- Backfill existing orders with current theme prices
UPDATE "Order" o
SET "basePrice" = COALESCE(
  (SELECT (t.settings->'creationDelivery'->>'paymentAmount')::int
   FROM "Theme" t
   WHERE t.slug = o."themeSlug"),
  497000
)
WHERE o."basePrice" IS NULL;
