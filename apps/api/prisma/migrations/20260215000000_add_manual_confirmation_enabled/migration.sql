-- Add manual confirmation toggle to Settings
ALTER TABLE "Settings"
ADD COLUMN "manualConfirmationEnabled" BOOLEAN NOT NULL DEFAULT false;

