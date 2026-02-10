# Infra (Docker DB + PM2)

Dokumentasi resmi untuk menjalankan aplikasi di server menggunakan:

- **Database Postgres via Docker Compose**
- **Aplikasi via PM2** (`valentine-api`, `valentine-worker`, `valentine-web`)

## Prasyarat

- **Node.js**: disarankan LTS terbaru
- **Docker** + Docker Compose v2 (`docker compose ...`)
- **PM2** terpasang global:

```bash
npm i -g pm2
```

## 1) Setup database (Docker)

Jalankan Postgres:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Opsional: jika ingin mengganti user/password/db/port, buat file `infra/.env` dari contoh:

```bash
cp infra/.env.example infra/.env
```

Lalu edit nilainya (misal ganti port dari 5432 jika bentrok).

## 2) Konfigurasi environment API

API dan worker akan membaca `.env` dari `apps/api/.env`.

```bash
cp apps/api/.env.example apps/api/.env
```

Hal yang wajib dicek:

- **`DATABASE_URL`** harus mengarah ke Postgres docker di host yang sama, contoh:

```bash
DATABASE_URL="postgresql://valentine:valentine@127.0.0.1:5432/valentine?schema=public"
```

- **`ADMIN_JWT_SECRET`**, **`ENCRYPTION_KEY`**, **`ADMIN_PASSWORD`** wajib diganti untuk produksi.

- **Email verification (Resend)**:
  - Set **`EMAIL_PROVIDER="resend"`** (recommended)
  - Set **`RESEND_API_KEY`** dari dashboard Resend
  - Set **`RESEND_FROM`**:
    - Dev cepat: `"onboarding@resend.dev"`
    - Produksi: gunakan sender dari domain yang sudah diverifikasi di Resend
  - (Rollback) set **`EMAIL_PROVIDER="smtp"`** untuk kembali ke SMTP via `SMTP_*`

- **WhatsApp delivery (YCloud template)**:
  - Konfigurasi WhatsApp gateway dilakukan via **Admin Panel → Settings → WhatsApp Gateway**.
  - Set **`ycloudTemplateName`** ke **template reminder** yang mengingatkan bahwa lagu sudah dikirim ke email.
    - Disarankan: template **tanpa variable** (reminder-only).

Catatan keamanan:

- Jangan pernah commit `apps/api/.env` (berisi secret).

## 3) Install dependency + build

Dari root repo:

```bash
npm ci
npm run build
```

## 4) Jalankan migrasi database (Prisma)

Pastikan Postgres sudah up, lalu deploy migrations:

```bash
cd apps/api
npx prisma generate
npx prisma migrate deploy
```

Jika butuh seed (opsional):

```bash
cd apps/api
npx prisma db seed
```

## 5) Menjalankan aplikasi dengan PM2

Konfigurasi PM2 ada di `infra/ecosystem.config.cjs`.

Start semua proses:

```bash
pm2 start infra/ecosystem.config.cjs
```

Atau via npm script:

```bash
npm run pm2:start
```

Perintah berguna:

```bash
pm2 status
pm2 logs valentine-api
pm2 logs valentine-worker
pm2 logs valentine-web
pm2 reload infra/ecosystem.config.cjs
```

Agar auto-start saat reboot server:

```bash
pm2 startup
pm2 save
```

## 6) Port yang digunakan

- **API**: `0.0.0.0:3001` (endpoint health: `/health`)
- **Web**: `0.0.0.0:3000` (Vite preview untuk serve hasil build)
- **Postgres**: `localhost:${POSTGRES_PORT:-5432}`

### Routing Web → API (penting)

Secara default frontend memanggil API lewat path relatif (`/api/...`). Artinya **web dan api harus satu origin** (domain + port sama) lewat reverse proxy.

Untuk production, sangat disarankan pakai **reverse proxy (Nginx/Caddy)** untuk TLS dan routing:

- `/` → web (`3000`)
- `/api` → api (`3001`)

Alternatif (tanpa reverse proxy): set `VITE_API_BASE_URL` saat build web (build-time env), lalu build ulang.

Contoh `apps/web/.env.production`:

```bash
VITE_API_BASE_URL="http://127.0.0.1:3001"
```

Lalu:

```bash
cd apps/web
npm run build
```

## Troubleshooting

- **API/worker error “Missing DATABASE_URL”**:
  - Pastikan `apps/api/.env` ada dan `DATABASE_URL` valid.
- **Tidak bisa konek ke Postgres (ECONNREFUSED)**:
  - Cek container: `docker compose -f infra/docker-compose.yml ps`
  - Pastikan port tidak bentrok, ubah `POSTGRES_PORT` di `infra/.env`.
- **Migrasi Prisma gagal**:
  - Pastikan `DATABASE_URL` benar dan database up.
  - Jalankan ulang: `cd apps/api && npx prisma migrate deploy`

