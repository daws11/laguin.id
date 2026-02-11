-- Add emailLower for case-insensitive uniqueness on email.
ALTER TABLE "Customer" ADD COLUMN "emailLower" TEXT;

-- Backfill normalized emailLower.
UPDATE "Customer"
SET "emailLower" = lower(trim("email"))
WHERE "email" IS NOT NULL
  AND "emailLower" IS NULL;

-- If there are existing duplicates by normalized email, keep delivery-safe historical data:
-- - Keep one canonical row per emailLower unchanged (earliest createdAt, then smallest id).
-- - For other rows, keep "email" intact (so delivery can still work) but make emailLower unique
--   by appending a deterministic suffix.
WITH ranked AS (
  SELECT
    "id",
    "emailLower",
    ROW_NUMBER() OVER (PARTITION BY "emailLower" ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "Customer"
  WHERE "emailLower" IS NOT NULL
)
UPDATE "Customer" c
SET "emailLower" = c."emailLower" || '__dup__' || c."id"
FROM ranked r
WHERE c."id" = r."id"
  AND r.rn > 1;

-- Create unique index (allows multiple NULLs).
CREATE UNIQUE INDEX "Customer_emailLower_key" ON "Customer"("emailLower");

