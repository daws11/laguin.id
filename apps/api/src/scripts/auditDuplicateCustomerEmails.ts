import { prisma } from '../lib/prisma'

type Row = { email_lower: string; customer_count: bigint }

async function main() {
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT lower(trim("email")) as email_lower, COUNT(*)::bigint as customer_count
    FROM "Customer"
    WHERE "email" IS NOT NULL
    GROUP BY lower(trim("email"))
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, lower(trim("email")) ASC
  `

  if (!rows.length) {
    console.log('No duplicate customer emails found (case-insensitive).')
    return
  }

  console.log(`Found ${rows.length} duplicate email groups:`)
  for (const r of rows) {
    console.log(`- ${r.email_lower}: ${r.customer_count.toString()} customers`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

