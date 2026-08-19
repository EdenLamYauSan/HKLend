/**
 * scripts/scraper/src/generate-articles.ts
 *
 * Story 8.2: AI Blog Article Generation Script.
 *
 * Generates 3 draft blog articles per run using Claude and saves them to the
 * Article table with isPublished=false for admin review.
 *
 * Uses the same Prisma client pattern as env.ts (ARCH-3 exception: generated
 * Prisma client is shared via relative path).
 *
 * Run:
 *   SCRAPER_DATABASE_URL="..." ANTHROPIC_API_KEY="..." npx tsx src/generate-articles.ts
 *   # Dry-run (no DB write):
 *   SCRAPER_DATABASE_URL="..." ANTHROPIC_API_KEY="..." npx tsx src/generate-articles.ts --dry-run
 */

import Anthropic from '@anthropic-ai/sdk'
import { getScraperDb } from './env'

const SYSTEM_PROMPT = `你是一位香港個人財務專欄作家，為持牌放債人資訊平台撰寫教育性文章。
寫作風格：專業但易讀，像《信報》財經版的個人理財欄目。
不是廣告文案 — 不推銷任何特定機構，客觀陳述事實與建議。
語言：繁體中文，香港慣用詞彙（用「借貸」不用「贷款」，「年利率」不用「年化利率」）。
文章結構：標題、引言（2句）、3-4個小節、結語。
長度：800-1200字。
格式：Markdown（使用 ##、###、**粗體**、- 列表）。`

const TOPIC_POOL = [
  '如何比較香港持牌放債人：利率、費用與條款全面分析',
  '認識實際年利率（APR）：借錢前必須了解的數字',
  '環聯信貸報告（TU）查閱指南：影響貸款審批的關鍵因素',
  '持牌放債人與財務公司有何分別？借款人須知',
  '香港無牌放債人的風險：識別與避免',
  '私人貸款還款計劃：如何選擇最適合自己的方案',
  '緊急備用金的重要性：建立財務緩衝的實用方法',
  '債務整合貸款是否適合你？優缺點分析',
  '個人預算管理：月底不再「月光」的方法',
  '借貸前必問的十個問題：保護自己的借款人守則',
  '信用評分如何影響貸款利率：改善信貸評級的步驟',
  '香港放債人條例重點解讀：借款人的法律保障',
]

function generateSlug(date: Date, index: number): string {
  const d = date.toISOString().slice(0, 10).replace(/-/g, '')
  return `hk-finance-${d}-${index + 1}`
}

function buildUserPrompt(topic: string, recentTitles: string[]): string {
  return `請根據以下主題撰寫一篇文章：${topic}

最近已發佈的文章標題（請避免重複相同主題）：
${recentTitles.join('\n')}

回傳 JSON 格式（只回傳 JSON，不要其他文字）：
{
  "titleZh": "文章標題",
  "bodyZh": "Markdown 正文",
  "seoTitle": "SEO 標題（60字以內）",
  "seoDescription": "SEO 描述（150字以內）",
  "category": "LENDING",
  "tags": ["標籤1", "標籤2"]
}`
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const prisma = getScraperDb()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const recent = await prisma.article.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { titleZh: true },
  })
  const recentTitles = recent.map((a: { titleZh: string }) => a.titleZh)

  const available = TOPIC_POOL.filter(
    (t: string) => !recentTitles.some((r: string) => r.slice(0, 10) === t.slice(0, 10))
  )
  const picks = available.slice(0, 3).length > 0 ? available.slice(0, 3) : TOPIC_POOL.slice(0, 3)

  const today = new Date()
  for (let i = 0; i < picks.length; i++) {
    console.log(`[generate-articles] Generating ${i + 1}/3: ${picks[i]}`)
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(picks[i], recentTitles) }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    // Strip markdown code fences if Claude wraps JSON
    const cleaned = raw.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim()
    const article = JSON.parse(cleaned)
    const excerpt = article.bodyZh.replace(/#{1,6}\s|[*`\-_]/g, '').slice(0, 150)
    const slug = generateSlug(today, i)

    if (dryRun) {
      console.log(JSON.stringify({ slug, ...article, excerpt }, null, 2))
      continue
    }

    await prisma.article.create({
      data: {
        slug,
        titleZh: article.titleZh,
        bodyZh: article.bodyZh,
        excerpt,
        category: article.category === 'PERSONAL_FINANCE' ? 'PERSONAL_FINANCE' : 'LENDING',
        tags: Array.isArray(article.tags) ? article.tags : [],
        seoTitle: article.seoTitle ?? null,
        seoDescription: article.seoDescription ?? null,
        isPublished: false,
      },
    })
    console.log(`[generate-articles] Saved draft: ${slug}`)
  }

  await prisma.$disconnect()
  console.log('[generate-articles] Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
