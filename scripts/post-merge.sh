#!/bin/bash
set -e

echo "[post-merge] Installing npm packages..."
npm install

echo "[post-merge] Generating Prisma client..."
npx prisma generate --schema=apps/api/prisma/schema.prisma

echo "[post-merge] Pushing database schema..."
npx prisma db push --schema=apps/api/prisma/schema.prisma --accept-data-loss

echo "[post-merge] Done."
