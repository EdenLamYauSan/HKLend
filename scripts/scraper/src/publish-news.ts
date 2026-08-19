import { getScraperDb } from './env.ts'

async function main() {
  const db = getScraperDb()
  const r = await db.newsItem.updateMany({
    where: { status: 'DRAFT' },
    data: { status: 'PUBLISHED' },
  })
  console.log('Published:', r.count)
  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
