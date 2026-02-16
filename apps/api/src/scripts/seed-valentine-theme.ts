import { prisma } from '../lib/prisma'
import { getOrCreateSettings } from '../lib/settings'

async function main() {
  const settings = await getOrCreateSettings()
  
  const existing = await prisma.theme.findUnique({ where: { slug: 'valentine' } })
  if (existing) {
    console.log('Valentine theme already exists, skipping.')
    return
  }
  
  await prisma.theme.create({
    data: {
      slug: 'valentine',
      name: 'Valentine',
      isActive: true,
      settings: settings.publicSiteConfig ?? {},
    },
  })
  
  await prisma.settings.update({
    where: { id: settings.id },
    data: { defaultThemeSlug: 'valentine' },
  })
  
  console.log('Valentine theme created and set as default.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
