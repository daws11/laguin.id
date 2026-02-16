-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "themeSlug" TEXT;

-- AlterTable
ALTER TABLE "OrderDraft" ADD COLUMN     "themeSlug" TEXT;

-- AlterTable
ALTER TABLE "PageView" ADD COLUMN     "themeSlug" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "defaultThemeSlug" TEXT,
ADD COLUMN     "showThemesInFooter" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Theme_slug_key" ON "Theme"("slug");

-- CreateIndex
CREATE INDEX "Theme_isActive_idx" ON "Theme"("isActive");

-- CreateIndex
CREATE INDEX "Order_themeSlug_idx" ON "Order"("themeSlug");

-- CreateIndex
CREATE INDEX "OrderDraft_themeSlug_idx" ON "OrderDraft"("themeSlug");

-- CreateIndex
CREATE INDEX "PageView_themeSlug_idx" ON "PageView"("themeSlug");
