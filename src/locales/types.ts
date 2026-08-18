/**
 * src/locales/types.ts — Locale key type definitions.
 *
 * ALL user-facing strings are defined here. No hardcoded UI strings in components (NFR-11).
 * Missing keys produce a TypeScript error at build time because zh.ts and en.ts
 * must both satisfy the `Translation` type exactly.
 *
 * UX-DR25: TC copy is written directly in HK Cantonese-influenced Chinese.
 * EN is parallel copy — not a literal translation.
 */

export type Translation = {
  // ── Site meta ──────────────────────────────────────────────────────────────
  siteName: string
  siteTagline: string
  siteDescription: string

  // ── Scope banner (UX-DR9) ──────────────────────────────────────────────────
  scopeBanner: {
    text: string
    hkmaLink: string
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  nav: {
    lenders: string
    calculator: string
    scamBoard: string
    news: string
    myShortlist: string
    language: string
    homepageAriaLabel: string
  }

  // ── Common actions ──────────────────────────────────────────────────────────
  actions: {
    search: string
    filter: string
    clear: string
    close: string
    cancel: string
    save: string
    submit: string
    confirm: string
    back: string
    loadMore: string
    share: string
    compare: string
    addToCompare: string
    removeFromCompare: string
    bookmark: string
    removeBookmark: string
    viewAll: string
    copyLink: string
    apply: string
    enquire: string
  }

  // ── Error states ────────────────────────────────────────────────────────────
  errors: {
    notFound: string
    notFoundDescription: string
    serverError: string
    serverErrorDescription: string
    networkError: string
    validationError: string
    rateLimited: string
    rateLimitedDescription: string
    turnstileFailed: string
    unauthorized: string
  }

  // ── Empty states ────────────────────────────────────────────────────────────
  emptyStates: {
    noResults: string
    noReviews: string
    noReviewsAction: string
    noFlags: string
    noNews: string
    noActivity: string
  }

  // ── Lender directory ────────────────────────────────────────────────────────
  lenders: {
    title: string
    searchPlaceholder: string
    filterByDistrict: string
    filterByLoanType: string
    sortByName: string
    sortByNewest: string
    totalCount: string   // e.g. "共 {n} 間"
    card: {
      eligibilityUnconfirmed: string
      registrationNumber: string
      visitWebsite: string
      applyEnquire: string
      applyDisclaimer: string
      moreTypes: string  // "+N more"
    }
    zeroResult: {
      title: string
      description: string
      hkmaLink: string
      retrySearch: string
      viewScamBoard: string
    }
  }

  // ── Lender profile ──────────────────────────────────────────────────────────
  profile: {
    licenceInfo: string
    licenceNumber: string
    licenceStatus: string
    licenceVerified: string
    address: string
    district: string
    phone: string
    website: string
    loanTypes: string
    eligibleFor: string
    eligibilityUnconfirmed: string
    adminNote: string
    rateInfo: string
    contactForRates: string
    lenderPulse: string
    activityFeed: string
    activityFeedTitle: string
    activityFeedExpand: string  // "查看全部 {n} 條記錄"
    reviews: string
    writeReview: string
    redFlags: string
    submitFlag: string
  }

  // ── Licence badge (UX-DR1) ──────────────────────────────────────────────────
  licenceBadge: {
    active: string
    suspended: string
    revoked: string
    ariaLabel: string   // "牌照狀態：{status}"
    lastVerified: string
  }

  // ── Reviews ─────────────────────────────────────────────────────────────────
  reviews: {
    approvalSpeed: string
    rateAccuracy: string
    staffAttitude: string
    transparency: string
    overallRating: string
    anonymous: string
    pending: string
    writeTitle: string
    bodyPlaceholder: string
    nameLabel: string
    namePlaceholder: string
    successMessage: string
    minReviewsRequired: string  // "New — no rating yet"
    reviewCount: string         // "{n} 則評論"
    helpful: string
    notHelpful: string
    report: string
    trendUp: string
    trendDown: string
  }

  // ── Data attribution (UX-DR4) ──────────────────────────────────────────────
  dataSource: {
    attribution: string   // "資料來源：香港公司登記冊"
    lastChecked: string   // "最後檢查：{date}"
    freshnessLabel: string
  }

  // ── Legal / disclaimers ─────────────────────────────────────────────────────
  legal: {
    disclaimer: string
    scamBoardDisclaimer: string   // UX-DR23
    leavingSiteWarning: string
    platformClarification: string // UX-DR10 share recipient
  }

  // ── Turnstile ────────────────────────────────────────────────────────────────
  captcha: {
    verifying: string
    failed: string
  }

  // ── Admin (TC only — EN mirrors TC, not translated) ─────────────────────────
  admin: {
    loginTitle: string
    passwordLabel: string
    loginButton: string
    loginError: string
    dashboard: string
    lenders: string
    reviews: string
    flags: string
    scamBoard: string
    news: string
    scraperRuns: string
    seasonAlerts: string
    logoutButton: string
    noPermission: string
  }
}

export type Locale = 'zh' | 'en'

export type LocalizedRecord<T extends Record<string, unknown>> = T & {
  [K in keyof T as K extends `${infer Field}Zh`
    ? `${Field}En`
    : never]?: T[K] | null
}
