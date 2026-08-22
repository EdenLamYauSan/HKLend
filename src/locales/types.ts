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

  // ── Flags (UX-DR8, FR-39) ────────────────────────────────────────────────────
  flags: {
    sectionTitle: string
    submitButton: string
    modalTitle: string
    legalDisclaimer: string   // must scroll past before form is accessible
    categoryLabel: string
    detailsLabel: string      // optional details textarea
    detailsPlaceholder: string
    detailsCharCount: string  // "{n}/500 字"
    successMessage: string
    warningBanner: string     // ≥5 flags in 90 days
    risingComplaints: string  // Lender Pulse velocity label (≥3 in 30d)
    // Categories
    categories: {
      HARASSMENT: string
      ILLEGAL_TERMS: string
      FAKE_IDENTITY: string
      OVERCHARGING: string
      OTHER: string
    }
  }

  // ── Scam board (FR-31–FR-34) ─────────────────────────────────────────────────
  scamBoard: {
    pageTitle: string
    pageDescription: string
    hkpfLink: string          // link text to HKPF anti-scam page
    submitButton: string      // "舉報詐騙"
    searchPlaceholder: string
    legalDisclaimer: string   // UX-DR23
    emptyState: string
    reportCount: string       // "{n} 宗已核實舉報"
    // Report form
    form: {
      companyNameLabel: string
      companyNamePlaceholder: string
      licenceLabel: string
      licencePlaceholder: string
      incidentDateLabel: string
      lossAmountLabel: string
      evidenceLabel: string
      evidencePlaceholder: string
      evidenceCharCount: string  // "{n}/2000 字"
      successMessage: string
      legalDisclaimer: string
    }
    // Report card
    card: {
      verifiedLabel: string   // "已核實"
      licenceClaimed: string
      incidentDate: string
      estimatedLoss: string
      readMore: string
      showLess: string
    }
  }

  // ── Turnstile ────────────────────────────────────────────────────────────────
  captcha: {
    verifying: string
    failed: string
  }

  // ── News feed (FR-35, Story 6.2) ──────────────────────────────────────────────
  news: {
    pageTitle: string
    pageDescription: string
    empty: string
    translationUnavailable: string  // "Translation not available — showing Chinese original"
    relatedLenders: string          // "相關放債人"
    categories: {
      regulatory: string
      industry: string
      enforcement: string
      general: string
    }
  }

  // ── APR Calculator (Story 5.3) ──────────────────────────────────────────────
  calculator: {
    title: string
    loanAmount: string
    loanAmountPlaceholder: string
    tenor: string
    tenorUnit: string            // "個月"
    flatRate: string
    flatRateUnit: string         // "% / 月"
    monthlyPayment: string
    totalRepayable: string
    apr: string
    emptyResult: string          // "—"
    useLenderRate: string        // "使用此放債人最低利率"
    flatRateTooltipTitle: string
    flatRateTooltipBody: string  // explanation of flat rate vs APR
    shareWhatsApp: string
    shareText: string            // "{amount} / {tenor} 月 → 月供 {payment}，APR {apr}%"
    errorMin: string
    errorMax: string
    errorRequired: string
  }

  // ── Compare tray (Story 5.4) ─────────────────────────────────────────────────
  compareTray: {
    maxReached: string        // "最多可比較4間放債人"
    compareButton: string     // "比較"
    removeAriaLabel: string   // "移除 {name}"
  }

  // ── Comparison grid (Story 5.6) ─────────────────────────────────────────────
  compareGrid: {
    title: string
    emptyPrompt: string       // "請先從名冊中選擇至少兩間放債人進行比較。"
    backToDirectory: string
    attributes: {
      company: string
      licenceStatus: string
      district: string
      loanTypes: string
      rateRange: string
      apr: string
      tenor: string
    }
    shareWhatsApp: string
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

  // ── Quiz (Story 7.1) ────────────────────────────────────────────────────────
  quiz: {
    title: string
    description: string
    progressLabel: string   // "第 {current} 題，共 {total} 題"
    nextButton: string
    backButton: string
    submitButton: string
    resultTitle: string
    resultCount: string      // "為你找到 {N} 間符合條件的持牌放債人"
    confirmedBadge: string
    unconfirmedBadge: string // "資格待確認，請直接查詢"
    noResultMessage: string
    noResultAction: string
    questions: {
      employment: {
        label: string
        salaried: string
        selfEmployed: string
        unemployed: string
      }
      income: {
        label: string
        below10k: string
        from10kTo20k: string
        from20kTo50k: string
        above50k: string
      }
      loanAmount: {
        label: string
        below50k: string
        from50kTo200k: string
        from200kTo1m: string
        above1m: string
      }
      purpose: {
        label: string
        personal: string
        business: string
        mortgage: string
        other: string
      }
      existingLoans: {
        label: string
        yes: string
        no: string
      }
    }
  }

  // ── Bookmarks (Story 7.2) ───────────────────────────────────────────────────
  bookmarks: {
    pageTitle: string
    addAriaLabel: string     // "收藏 {name}"
    removeAriaLabel: string  // "移除收藏 {name}"
    removeButton: string
    addAllToCompare: string
    emptyTitle: string
    emptyDescription: string
    emptyAction: string
  }

  // ── WhatsApp Share (Story 7.3) ──────────────────────────────────────────────
  whatsapp: {
    shareButton: string           // "分享 WhatsApp"
    shareAriaLabel: string        // "透過WhatsApp分享{name}"
    shareText: string             // "{name} — hklend 持牌放債人名冊\n{url}"
  }

  // ── Season Alert (Stories 7.4 / 7.5) ───────────────────────────────────────
  seasonAlert: {
    dismissAriaLabel: string     // "關閉通知"
    adminPageTitle: string
    adminNewButton: string
    adminEditTitle: string
    adminCreateTitle: string
    adminTableTitleCol: string
    adminTableDateRangeCol: string
    adminTableActiveCol: string
    adminTableActionsCol: string
    adminDeleteConfirm: string
    adminSaveSuccess: string
    adminDeleteSuccess: string
    formTitleZhLabel: string
    formTitleEnLabel: string
    formBodyZhLabel: string
    formBodyEnLabel: string
    formCtaLabelZhLabel: string
    formCtaLabelEnLabel: string
    formCtaUrlLabel: string
    formStartDateLabel: string
    formEndDateLabel: string
    formIsActiveLabel: string
  }

  // ── Borrower Authentication (Story 8.1 — Auth.js v5 email magic link) ──────
  // FR-64/65/69. Soft gate: browse free, sign in only to submit.
  auth: {
    signIn: {
      title: string
      emailLabel: string
      emailPlaceholder: string
      submit: string
      readAnonymously: string
      turnstileError: string
      rateLimitError: string
      emailServiceDown: string
    }
    sent: {
      title: string
      body: string
      resend: string
      resendSuccess: string
    }
    expired: {
      title: string
      body: string
      resend: string
    }
    prompt: {
      title: string
      defaultReason: string
      successMessage: string
      // Story 8.1 ships only a smoke-test trigger for this modal on
      // /[locale]/sign-in — Story 8.2 wires real triggers (review/flag/
      // scam-report/vote submit buttons) and this label goes away.
      smokeTriggerLabel: string
    }
    // Email body copy — the magic-link email is always sent TC-default
    // regardless of the recipient's site locale (see Story 8.1 AC-3).
    email: {
      subject: string
      greeting: string
      linkCta: string
      expiryLine: string
      ignoreIfNotYou: string
      enToggleLine: string
    }
    signOut: {
      button: string
    }
  }
}

export type Locale = 'zh' | 'en'

export type LocalizedRecord<T extends Record<string, unknown>> = T & {
  [K in keyof T as K extends `${infer Field}Zh`
    ? `${Field}En`
    : never]?: T[K] | null
}
