import { PrismaClient } from '@prisma/client'
import { seedCourseData } from '../src/lib/course-data'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  await seedCourseData(prisma)

  console.log('Database seed completed.')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
