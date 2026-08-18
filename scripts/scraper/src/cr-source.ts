/**
 * Companies Registry (CR) money lender licence PDF parser.
 *
 * The CR is the statutory licensing authority for money lenders in HK under
 * the Money Lenders Ordinance. They publish a PDF list of current licensees at:
 *   https://www.cr.gov.hk/en/statistics/docs/ml_licensees1.pdf  (alphabetical)
 *   https://www.cr.gov.hk/en/statistics/docs/ml_licensees2.pdf  (by licence no.)
 *
 * Each row in the PDF has:
 *   MLR No. | Licence No. | English Name | Chinese Name (optional) | Expiry Date | Remarks (R optional)
 *
 * Usage:
 *   SCRAPER_DATABASE_URL=... npx tsx src/scrape-hkma.ts --cr
 *   SCRAPER_DATABASE_URL=... HKMA_CR_PDF_PATH=/path/to/ml_licensees1.pdf npx tsx src/scrape-hkma.ts --cr
 *
 * ARCH-3: No import from ../../src/
 */

import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { HkmaRecord } from './hkma-source'

const CR_PDF_URL = 'https://www.cr.gov.hk/en/statistics/docs/ml_licensees1.pdf'

// Strip control characters and trim whitespace
function clean(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x1F\x7F]/g, '').trim()
}

// Matches a licence expiry date like "8-Nov-26" or "31-May-2026"
const DATE_RE = /\d{1,2}-[A-Za-z]{3}-\d{2,4}/

// Matches Chinese characters (CJK unified ideographs + fullwidth brackets)
const CHINESE_CHAR_RE = /[一-鿿（）（）]/

// Matches licence number patterns: "56/2026", "1340/2025", "0867/2025-1"
const LICENCE_NO_RE = /^\d{1,4}\/\d{4}(-\d+)?$/

type PendingRecord = {
  mlrNo: string
  licenceNo: string
  companyNameEn: string
  companyNameZh: string | null
  licenceIssuedDate: Date | null
  licenceExpiryDate: Date | null
  isRenewalPending: boolean
  complete: boolean  // true once a date has been found
}

/**
 * Check if a line opens a new data record (starts with MLR + licence number).
 * Does NOT require a date — multi-line records have their date on a later line.
 */
function detectRecordStart(line: string): { mlrNo: string; licenceNo: string; body: string } | null {
  const tokens = line.split(/\s+/)
  if (!/^\d+$/.test(tokens[0])) return null
  if (!LICENCE_NO_RE.test(tokens[1])) return null
  const body = tokens.slice(2).join(' ')
  return { mlrNo: tokens[0], licenceNo: tokens[1], body }
}

/**
 * Extract names and optional date(s) from a body string (everything after MLR + licence).
 * Returns updated fields. Date(s) may be absent if the record spans multiple lines.
 *
 * The CR PDF has two date columns per record: Issue Date then Expiry Date.
 * When both are present in the body, the first match is licenceIssuedDate and
 * the second is licenceExpiryDate. When only one date is present (e.g. a
 * continuation line), it is treated as licenceExpiryDate (existing behaviour).
 */
function parseBody(body: string, existing: Pick<PendingRecord, 'companyNameEn' | 'companyNameZh'>): Partial<PendingRecord> {
  // Collect all date matches from the body
  const allDates: Array<{ match: string; index: number }> = []
  let searchFrom = 0
  let m: RegExpExecArray | null
  const reCopy = new RegExp(DATE_RE.source, DATE_RE.flags)
  while ((m = reCopy.exec(body.slice(searchFrom))) !== null) {
    allDates.push({ match: m[0], index: searchFrom + m.index })
    searchFrom += m.index + m[0].length
  }

  // Everything before the first date is the name portion
  const namePortion = allDates.length > 0 ? body.slice(0, allDates[0].index) : body
  const result = splitNames(namePortion, existing)

  if (allDates.length === 0) {
    return { ...result, licenceIssuedDate: null, licenceExpiryDate: null, isRenewalPending: false, complete: false }
  }

  if (allDates.length === 1) {
    // Single date: treat as expiry only (no issue date available)
    const afterDate = body.slice(allDates[0].index + allDates[0].match.length).trim()
    return {
      ...result,
      licenceIssuedDate: null,
      licenceExpiryDate: parseDate(allDates[0].match),
      isRenewalPending: afterDate === 'R',
      complete: true,
    }
  }

  // Two or more dates: first = issued, second = expiry
  const lastDate = allDates[allDates.length - 1]
  const afterLast = body.slice(lastDate.index + lastDate.match.length).trim()
  return {
    ...result,
    licenceIssuedDate: parseDate(allDates[0].match),
    licenceExpiryDate: parseDate(lastDate.match),
    isRenewalPending: afterLast === 'R',
    complete: true,
  }
}

/**
 * Split a name portion into EN and ZH parts.
 * Some ZH names have a numeric prefix (e.g. "001信貸有限公司") that sits
 * after the EN name — detect and move those digits to the ZH name.
 */
function splitNames(
  namePortion: string,
  existing: Pick<PendingRecord, 'companyNameEn' | 'companyNameZh'>
): Pick<PendingRecord, 'companyNameEn' | 'companyNameZh'> {
  let splitIndex = -1
  for (let i = 0; i < namePortion.length; i++) {
    if (CHINESE_CHAR_RE.test(namePortion[i])) { splitIndex = i; break }
  }

  if (splitIndex === -1) {
    const enPart = clean(namePortion)
    return {
      companyNameEn: enPart ? `${existing.companyNameEn} ${enPart}`.trim() : existing.companyNameEn,
      companyNameZh: existing.companyNameZh,
    }
  }

  const beforeChinese = namePortion.slice(0, splitIndex)
  const numericPrefix = /^(.*?)\s*(\d+)\s*$/.exec(beforeChinese)
  const enPart = clean(numericPrefix ? numericPrefix[1] : beforeChinese)
  const zhPrefix = numericPrefix ? numericPrefix[2] : ''
  const zhPart = clean(zhPrefix + namePortion.slice(splitIndex))

  return {
    companyNameEn: enPart ? `${existing.companyNameEn} ${enPart}`.trim() : existing.companyNameEn,
    companyNameZh: zhPart || existing.companyNameZh,
  }
}

function parseDate(dateStr: string): Date | null {
  try {
    const [day, mon, year] = dateStr.split('-')
    const fullYear = year.length === 2 ? `20${year}` : year
    return new Date(`${day} ${mon} ${fullYear}`)
  } catch {
    return null
  }
}

/**
 * Fetch and parse the CR licensee PDF, returning HkmaRecord-compatible rows.
 * Optionally accepts a local file path to skip the download.
 */
export async function loadHkmaRecordsFromCrPdf(localPath?: string): Promise<HkmaRecord[]> {
  let pdfBuffer: Buffer

  if (localPath) {
    const absPath = resolve(localPath)
    if (!existsSync(absPath)) throw new Error(`[cr-source] PDF not found: ${absPath}`)
    console.log(`[cr-source] Loading from local file: ${absPath}`)
    pdfBuffer = readFileSync(absPath)
  } else {
    console.log(`[cr-source] Downloading CR PDF: ${CR_PDF_URL}`)
    const response = await fetch(CR_PDF_URL, {
      signal: AbortSignal.timeout(60_000),
      headers: { 'User-Agent': 'hklend-scraper/1.0' },
    })
    if (!response.ok) throw new Error(`[cr-source] CR PDF download failed: HTTP ${response.status}`)
    pdfBuffer = Buffer.from(await response.arrayBuffer())
    console.log(`[cr-source] Downloaded ${Math.round(pdfBuffer.length / 1024)} KB`)
  }

  // Write buffer to a temp file, extract text via Python's pypdf, then clean up.
  // pypdf is already available (used in dev tooling) and handles this PDF cleanly.
  const tmpPath = join(tmpdir(), `cr-pdf-${Date.now()}.pdf`)
  writeFileSync(tmpPath, pdfBuffer)
  let rawText: string
  try {
    rawText = execSync(
      `python3 -c "
from pypdf import PdfReader
r = PdfReader('${tmpPath}')
print('\\n'.join(p.extract_text() or '' for p in r.pages))
"`,
      { maxBuffer: 20 * 1024 * 1024 }
    ).toString()
  } finally {
    try { unlinkSync(tmpPath) } catch { /* ignore */ }
  }

  // Strip control characters from the full text before splitting
  // eslint-disable-next-line no-control-regex
  const lines = rawText.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '').split('\n')
  const records: HkmaRecord[] = []
  const seen = new Set<string>()

  let pending: PendingRecord | null = null

  function emit(row: PendingRecord) {
    const record = toHkmaRecord(row)
    if (record && !seen.has(record.licenceNumber)) {
      seen.add(record.licenceNumber)
      records.push(record)
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const newRecord = detectRecordStart(trimmed)

    if (newRecord) {
      // New MLR record — emit pending first (even if incomplete; date will be missing)
      if (pending) emit(pending)
      const base: PendingRecord = {
        mlrNo: newRecord.mlrNo,
        licenceNo: newRecord.licenceNo,
        companyNameEn: '',
        companyNameZh: null,
        licenceIssuedDate: null,
        licenceExpiryDate: null,
        isRenewalPending: false,
        complete: false,
      }
      const parsed = parseBody(newRecord.body, base)
      pending = { ...base, ...parsed }
      if (pending.complete) { emit(pending); pending = null }
      continue
    }

    if (!pending) continue

    // Continuation line — figure out what it contributes
    const hasDate = DATE_RE.test(trimmed)
    const containsChinese = CHINESE_CHAR_RE.test(trimmed)

    if (hasDate && containsChinese) {
      // ZH name + date(s) on its own line — everything before the first date is the ZH name.
      // Do NOT run splitNames here; the whole prefix belongs to ZH, not EN.
      // Collect all dates on this continuation line.
      const contDates: Array<{ match: string; index: number }> = []
      let contFrom = 0
      let cm: RegExpExecArray | null
      const reContCopy = new RegExp(DATE_RE.source, DATE_RE.flags)
      while ((cm = reContCopy.exec(trimmed.slice(contFrom))) !== null) {
        contDates.push({ match: cm[0], index: contFrom + cm.index })
        contFrom += cm.index + cm[0].length
      }
      const firstDate = contDates[0]
      const lastDate = contDates[contDates.length - 1]
      const zhRaw = trimmed.slice(0, firstDate.index).trim()
      const afterLast = trimmed.slice(lastDate.index + lastDate.match.length).trim()
      pending.companyNameZh = clean(zhRaw) || pending.companyNameZh
      if (contDates.length >= 2) {
        pending.licenceIssuedDate = parseDate(firstDate.match)
        pending.licenceExpiryDate = parseDate(lastDate.match)
      } else {
        // Only one date on continuation line — treat as expiry only
        pending.licenceExpiryDate = parseDate(firstDate.match)
      }
      pending.isRenewalPending = afterLast === 'R'
      pending.complete = true
      emit(pending)
      pending = null
    } else if (!hasDate) {
      // EN name continuation ("Limited", "Co.,", etc.)
      const cont = clean(trimmed)
      if (cont) pending.companyNameEn = `${pending.companyNameEn} ${cont}`.trim()
    }
    // hasDate + no Chinese → stray page header/footer; skip
  }

  // Flush final pending row
  if (pending) {
    const record = toHkmaRecord(pending)
    if (record && !seen.has(record.licenceNumber)) {
      seen.add(record.licenceNumber)
      records.push(record)
    }
  }

  console.log(`[cr-source] Parsed ${records.length} licensee records from CR PDF`)
  return records
}

function toHkmaRecord(row: PendingRecord): HkmaRecord | null {
  if (!row.companyNameEn && !row.companyNameZh) return null
  return {
    licenceNumber: row.licenceNo,
    licenceStatus: 'ACTIVE', // all records in ml_licensees1.pdf are current licensees
    companyNameZh: row.companyNameZh ?? row.companyNameEn, // fallback to EN if no ZH
    companyNameEn: row.companyNameEn || null,
    addressZh: null,
    addressEn: null,
    districtZh: null,
    districtEn: null,
    phone: null,
    licenceIssuedDate: row.licenceIssuedDate,
    licenceExpiryDate: row.licenceExpiryDate,
  }
}
