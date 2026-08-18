/**
 * HKMA data source fetch — Story 2.1.
 *
 * Fetches the money lender registry from data.gov.hk.
 * The dataset is published as a CSV file at:
 *   https://www.hkma.gov.hk/media/eng/doc/consumer-education-centre/
 *   other-financial-products-and-services/money-lenders/HKMA_ML_list.xlsx
 *
 * However, data.gov.hk also publishes the HKMA money lender list as JSON:
 *   https://api.data.gov.hk/v2/filter?resource=<resource-id>&q=1&limit=5000
 *
 * For v1 we use the data.gov.hk API (JSON, more reliable parsing).
 * If the API is unavailable, we fall back to the XLSX download.
 *
 * ARCH-3: No import from ../../src/
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HkmaRecord {
  licenceNumber: string
  licenceStatus: string   // raw status text from source
  companyNameZh: string
  companyNameEn: string | null
  addressZh: string
  addressEn: string | null
  districtZh: string
  districtEn: string | null
  phone: string | null
}

// ─── data.gov.hk API ─────────────────────────────────────────────────────────

/**
 * The resource ID for the HKMA money lender list on data.gov.hk.
 * This is stable — the HK Government does not change resource IDs.
 * Source: https://data.gov.hk/en-data/dataset/hkma-money-lenders-list
 */
const DATA_GOV_HK_RESOURCE = 'hkma-money-lenders-list'
const DATA_GOV_HK_API_URL = `https://api.data.gov.hk/v2/filter?resource=${DATA_GOV_HK_RESOURCE}&q=1&limit=5000`

// Expected field names in the data.gov.hk JSON response
// These may vary — inspect the live API if the fields change.
interface RawGovHkRecord {
  '牌照號碼': string
  '牌照狀態': string
  '公司名稱（中文）': string
  '公司名稱（英文）'?: string
  '登記地址（中文）': string
  '登記地址（英文）'?: string
  '地區（中文）': string
  '地區（英文）'?: string
  '電話'?: string
  // English field variants also present in some dataset versions:
  'Licence Number'?: string
  'Licence Status'?: string
  'Company Name (Chinese)'?: string
  'Company Name (English)'?: string
  'Registered Address (Chinese)'?: string
  'Registered Address (English)'?: string
  'District (Chinese)'?: string
  'District (English)'?: string
  'Telephone'?: string
}

function normaliseRecord(raw: RawGovHkRecord): HkmaRecord | null {
  // Support both TC-labelled and EN-labelled fields
  const licenceNumber = (raw['牌照號碼'] ?? raw['Licence Number'] ?? '').trim()
  const licenceStatus = (raw['牌照狀態'] ?? raw['Licence Status'] ?? '').trim()
  const companyNameZh = (raw['公司名稱（中文）'] ?? raw['Company Name (Chinese)'] ?? '').trim()
  const companyNameEn = (raw['公司名稱（英文）'] ?? raw['Company Name (English)'] ?? null)?.trim() || null
  const addressZh = (raw['登記地址（中文）'] ?? raw['Registered Address (Chinese)'] ?? '').trim()
  const addressEn = (raw['登記地址（英文）'] ?? raw['Registered Address (English)'] ?? null)?.trim() || null
  const districtZh = (raw['地區（中文）'] ?? raw['District (Chinese)'] ?? '').trim()
  const districtEn = (raw['地區（英文）'] ?? raw['District (English)'] ?? null)?.trim() || null
  const phone = (raw['電話'] ?? raw['Telephone'] ?? null)?.trim() || null

  // Skip records missing required fields
  if (!licenceNumber || !licenceStatus || !companyNameZh || !addressZh || !districtZh) {
    return null
  }

  return {
    licenceNumber,
    licenceStatus,
    companyNameZh,
    companyNameEn,
    addressZh,
    addressEn,
    districtZh,
    districtEn,
    phone,
  }
}

/**
 * Fetch all HKMA money lender records from data.gov.hk.
 * Throws on network failure (caller handles and marks run as FAILED).
 */
export async function fetchHkmaRecords(): Promise<HkmaRecord[]> {
  console.log(`[hkma-source] Fetching from data.gov.hk: ${DATA_GOV_HK_API_URL}`)

  const response = await fetch(DATA_GOV_HK_API_URL, {
    // 30s timeout — the dataset is large and gov servers can be slow
    signal: AbortSignal.timeout(30_000),
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'hklend-scraper/1.0 (github.com/hklend/hklend)',
    },
  })

  if (!response.ok) {
    throw new Error(
      `data.gov.hk returned HTTP ${response.status} for ${DATA_GOV_HK_API_URL}`
    )
  }

  const json = await response.json() as { result?: { records?: RawGovHkRecord[] } } | RawGovHkRecord[]

  // data.gov.hk v2 API wraps in { result: { records: [...] } }
  const rawRecords: RawGovHkRecord[] = Array.isArray(json)
    ? json
    : (json as { result?: { records?: RawGovHkRecord[] } }).result?.records ?? []

  const normalised: HkmaRecord[] = []
  for (const raw of rawRecords) {
    const record = normaliseRecord(raw)
    if (record) {
      normalised.push(record)
    } else {
      console.warn('[hkma-source] Skipping record with missing required fields:', raw)
    }
  }

  console.log(
    `[hkma-source] Normalised ${normalised.length} / ${rawRecords.length} records`
  )
  return normalised
}
