-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "s3Endpoint" TEXT,
ADD COLUMN "s3Bucket" TEXT,
ADD COLUMN "s3AccessKeyEnc" TEXT,
ADD COLUMN "s3SecretKeyEnc" TEXT,
ADD COLUMN "s3Region" TEXT;
