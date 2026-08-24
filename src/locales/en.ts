/**
 * src/locales/en.ts — English locale strings.
 *
 * UX-DR25: This is parallel copy written in English — not a translation from TC.
 * Verbs are action-oriented. Legal strings centralised here for easy correction.
 */

import type { Translation } from './types'

export const en: Translation = {
  // ── Site meta ──────────────────────────────────────────────────────────────
  siteName: 'HK Lend',
  siteTagline: 'Verify licences. Completely free.',
  siteDescription:
    'Check the licence status of any Hong Kong money lender, read community ratings, and avoid unlicensed lenders.',

  // ── Scope banner ──────────────────────────────────────────────────────────
  scopeBanner: {
    text: 'HK Lend verifies licences — we do not approve loans',
    hkmaLink: 'View Companies Registry official list',
  },

  // ── Navigation ──────────────────────────────────────────────────────────────
  nav: {
    lenders: 'Lender Directory',
    calculator: 'APR Calculator',
    scamBoard: 'Scam Board',
    news: 'Licence Updates',
    myShortlist: 'My Shortlist',
    language: '中文',
    homepageAriaLabel: 'HK Lend — back to homepage',
  },

  // ── Common actions ──────────────────────────────────────────────────────────
  actions: {
    search: 'Search',
    filter: 'Filter',
    clear: 'Clear',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    submit: 'Submit',
    confirm: 'Confirm',
    back: 'Back',
    loadMore: 'Load more',
    share: 'Share',
    compare: 'Compare',
    addToCompare: 'Add to Compare',
    removeFromCompare: 'Remove',
    bookmark: 'Save',
    removeBookmark: 'Remove',
    viewAll: 'View all',
    copyLink: 'Copy link',
    apply: 'Apply',
    enquire: 'Enquire',
  },

  // ── Error states ────────────────────────────────────────────────────────────
  errors: {
    notFound: 'Page not found',
    notFoundDescription: 'The page you were looking for does not exist or has been removed.',
    serverError: 'Something went wrong',
    serverErrorDescription: 'Please try again. If the problem persists, contact us.',
    networkError: 'Network error — please check your connection and try again.',
    validationError: 'Please check your input and try again.',
    rateLimited: 'Too many submissions',
    rateLimitedDescription: 'You have exceeded the submission limit. Please try again later.',
    turnstileFailed: 'Human verification failed. Please try again.',
    unauthorized: 'Please sign in to continue.',
  },

  // ── Empty states ────────────────────────────────────────────────────────────
  emptyStates: {
    noResults: 'No results found',
    noReviews: 'No reviews yet. Be the first to share your experience.',
    noReviewsAction: 'Write a Review',
    noFlags: 'No community flags yet',
    noNews: 'No updates yet',
    noActivity: 'No licence activity recorded',
  },

  // ── Lender directory ────────────────────────────────────────────────────────
  lenders: {
    title: 'Licensed Money Lender Directory',
    searchPlaceholder: 'Search by licence number or company name',
    filterByDistrict: 'Filter by district',
    filterByLoanType: 'Filter by loan type',
    sortByName: 'Name (A→Z)',
    sortByNewest: 'Newest registration',
    totalCount: '{n} lenders',
    card: {
      eligibilityUnconfirmed: 'Eligibility unconfirmed — check with lender',
      registrationNumber: 'Licence No.',
      visitWebsite: 'Visit website',
      applyEnquire: 'Apply / Enquire',
      applyDisclaimer: "You are leaving HK Lend and going to the lender's website",
      moreTypes: '+ {n} more',
    },
    zeroResult: {
      title: 'This name is not registered in the Money Lenders Register',
      description:
        'The official register uses full legal company names. Trade names and brand names may differ. Try searching by full name.',
      hkmaLink: 'View Companies Registry Money Lenders List',
      retrySearch: 'Search again',
      viewScamBoard: 'View Scam Board',
    },
  },

  // ── Lender profile ──────────────────────────────────────────────────────────
  profile: {
    licenceInfo: 'Licence Information',
    licenceNumber: 'Licence Number',
    licenceStatus: 'Licence Status',
    licenceVerified: 'Last Verified',
    address: 'Registered Address',
    district: 'District',
    phone: 'Phone',
    website: 'Website',
    loanTypes: 'Loan Types',
    eligibleFor: 'Suitable For',
    eligibilityUnconfirmed: 'Eligibility unconfirmed — check with lender',
    adminNote: 'Editor Note',
    rateInfo: 'Advertised Rates',
    contactForRates: 'Contact lender for rates',
    lenderPulse: 'Lender Pulse',
    activityFeed: 'Licence Activity',
    activityFeedTitle: 'Licence Activity History',
    activityFeedExpand: 'View all {n} records',
    reviews: 'Community Reviews',
    writeReview: 'Write a Review',
    redFlags: 'Community Flags',
    submitFlag: 'Submit a Flag',
  },

  // ── Licence badge ──────────────────────────────────────────────────────────
  licenceBadge: {
    active: 'Active Licence',
    suspended: 'Suspended',
    revoked: 'Revoked',
    ariaLabel: 'Licence status: {status}',
    lastVerified: 'Last verified: {date}',
  },

  // ── Reviews ─────────────────────────────────────────────────────────────────
  reviews: {
    approvalSpeed: 'Approval Speed',
    rateAccuracy: 'Rate Accuracy',
    staffAttitude: 'Staff Attitude',
    transparency: 'Transparency',
    overallRating: 'Overall Rating',
    anonymous: 'Anonymous',
    pending: 'Pending review',
    writeTitle: 'Write a Review',
    bodyPlaceholder: 'Share your experience applying or borrowing (50–500 characters)',
    nameLabel: 'Display name (optional)',
    namePlaceholder: 'Up to 20 characters',
    successMessage: 'Thank you for your review! It will be published after moderation.',
    minReviewsRequired: 'New — no rating yet',
    reviewCount: '{n} reviews',
    helpful: 'Helpful',
    notHelpful: 'Not helpful',
    report: 'Report review',
    trendUp: '↑ Rating trending up recently',
    trendDown: '↓ Rating trending down recently',
  },

  // ── Data attribution ──────────────────────────────────────────────────────
  dataSource: {
    attribution: 'Source: Companies Registry Hong Kong',
    lastChecked: 'Last checked: {date}',
    freshnessLabel: 'Source: Companies Registry Hong Kong · Last checked: {date}',
  },

  // ── Legal ─────────────────────────────────────────────────────────────────
  legal: {
    disclaimer:
      'HK Lend is for informational purposes only and does not constitute financial advice. Evaluate all loan decisions independently.',
    scamBoardDisclaimer:
      'The following reports are submitted by users and reviewed by moderators. They are not verified by any judicial authority in Hong Kong.',
    leavingSiteWarning:
      "You are leaving HK Lend and visiting the lender's website. HK Lend is not responsible for third-party content.",
    platformClarification:
      'You received a lender verification link — HK Lend is a free licence-checking tool, not a lending platform',
  },

  // ── Flags (UX-DR8, FR-39) ─────────────────────────────────────────────────
  flags: {
    sectionTitle: 'Community Flags',
    submitButton: 'Report a Problem',
    modalTitle: 'Report This Lender',
    legalDisclaimer:
      'This report is not a legal complaint. HK Lend does not provide legal advice. In emergencies, contact the police.',
    categoryLabel: 'Category of concern',
    detailsLabel: 'Details (optional)',
    detailsPlaceholder: 'Describe what happened (max 500 characters)',
    detailsCharCount: '{n}/500',
    successMessage:
      'Your report has been received. We will review it within 48 hours.',
    warningBanner:
      'This lender has received multiple complaints in the past 90 days. Please proceed with caution.',
    risingComplaints: 'Rising complaints',
    categories: {
      HARASSMENT: 'Harassment or threatening behaviour',
      ILLEGAL_TERMS: 'Hidden fees or unfair terms',
      FAKE_IDENTITY: 'Impersonating a licensed lender',
      OVERCHARGING: 'Rates or fees differ from advertised',
      OTHER: 'Other concern',
    },
  },

  // ── Scam board (FR-31–FR-34) ──────────────────────────────────────────────
  scamBoard: {
    pageTitle: 'Scam Board',
    pageDescription:
      'Browse user-submitted and reviewed scam alerts to protect yourself from fraudulent lenders.',
    hkpfLink: 'HKPF Anti-Scam Information',
    submitButton: 'Report a Scam',
    searchPlaceholder: 'Search by name or phone number',
    legalDisclaimer:
      'Reports below are submitted by users and have undergone basic review by HK Lend. We do not guarantee the accuracy of the content. If you suspect fraud, please report to the police.',
    emptyState:
      'No verified scam reports yet. If you encounter a suspicious lender, please file a report.',
    reportCount: '{n} verified report(s)',
    form: {
      companyNameLabel: 'Company or individual name',
      companyNamePlaceholder: 'Name of the reported entity',
      licenceLabel: 'Claimed licence number (optional)',
      licencePlaceholder: 'e.g. ML/XXXXXXXX/YYYY',
      incidentDateLabel: 'Incident date (optional)',
      lossAmountLabel: 'Estimated financial loss in HKD (optional)',
      evidenceLabel: 'Description of the incident',
      evidencePlaceholder:
        'Describe what happened, suspicious behaviour, and any relevant details (100–2,000 characters)',
      evidenceCharCount: '{n}/2,000',
      successMessage: 'Thank you for your report. We will review it as soon as possible.',
      legalDisclaimer:
        'By submitting, you confirm the information is truthful and understand that false reports may result in legal liability.',
    },
    card: {
      verifiedLabel: 'Verified',
      licenceClaimed: 'Claimed licence',
      incidentDate: 'Incident date',
      estimatedLoss: 'Estimated loss',
      readMore: 'Read more',
      showLess: 'Show less',
    },
  },

  // ── Captcha ───────────────────────────────────────────────────────────────
  captcha: {
    verifying: 'Verifying…',
    failed: 'Human verification failed. Please try again.',
  },

  // ── News feed ─────────────────────────────────────────────────────────────
  news: {
    pageTitle: 'Regulatory Updates',
    pageDescription: 'Latest Hong Kong money lending regulatory news and industry updates',
    empty: 'No news yet. Check back later.',
    translationUnavailable: 'English translation not available — showing Chinese original.',
    relatedLenders: 'Related Lenders',
    categories: {
      regulatory: 'Regulatory',
      industry: 'Industry',
      enforcement: 'Enforcement',
      general: 'General',
    },
  },

  // ── APR Calculator (Story 5.3) ────────────────────────────────────────────
  calculator: {
    title: 'APR Calculator',
    loanAmount: 'Loan Amount (HKD)',
    loanAmountPlaceholder: 'e.g. 100,000',
    tenor: 'Loan Term',
    tenorUnit: 'months',
    flatRate: 'Monthly Flat Rate (%)',
    flatRateUnit: '% / month',
    monthlyPayment: 'Monthly Payment',
    totalRepayable: 'Total Repayable',
    apr: 'True APR',
    emptyResult: '—',
    useLenderRate: "Use lender's lowest rate",
    flatRateTooltipTitle: 'Flat Rate vs APR',
    flatRateTooltipBody:
      'The monthly flat rate calculates interest on the original loan amount each month, ignoring that your principal reduces over time. APR accounts for this and gives a more accurate picture of your true borrowing cost. APR is typically twice or more than the flat rate.',
    shareWhatsApp: 'Share on WhatsApp',
    shareText: 'Loan {amount} over {tenor} months → Monthly payment {payment}, APR {apr}%',
    errorMin: 'Minimum value is {min}',
    errorMax: 'Maximum value is {max}',
    errorRequired: 'This field is required',
  },

  // ── Compare tray (Story 5.4) ───────────────────────────────────────────────
  compareTray: {
    maxReached: 'Maximum 4 lenders to compare',
    compareButton: 'Compare',
    removeAriaLabel: 'Remove {name}',
  },

  // ── Comparison grid (Story 5.6) ────────────────────────────────────────────
  compareGrid: {
    title: 'Compare Lenders',
    emptyPrompt: 'Please select at least two lenders from the directory to compare.',
    backToDirectory: 'Back to Directory',
    attributes: {
      company: 'Lender',
      licenceStatus: 'Licence Status',
      district: 'District',
      loanTypes: 'Loan Types',
      rateRange: 'Advertised Rate (Flat)',
      apr: 'True APR',
      tenor: 'Tenor (Months)',
    },
    shareWhatsApp: 'Share Comparison',
  },

  // ── Admin (TC mirrors EN for admin — admin UI is TC-only per spec) ─────────
  admin: {
    loginTitle: 'Admin Login',
    passwordLabel: 'Password',
    loginButton: 'Sign in',
    loginError: 'Incorrect password. Please try again.',
    dashboard: 'Dashboard',
    lenders: 'Lender Management',
    reviews: 'Review Moderation',
    flags: 'Flag Moderation',
    scamBoard: 'Scam Board Management',
    news: 'News Drafts',
    scraperRuns: 'Scraper Logs',
    seasonAlerts: 'Season Alerts',
    logoutButton: 'Sign out',
    noPermission: 'You do not have permission to view this page.',
  },

  // ── Quiz (Story 7.1) ────────────────────────────────────────────────────────
  quiz: {
    title: 'Find Your Match',
    description: 'Answer 5 quick questions to see lenders likely to suit your profile.',
    progressLabel: 'Question {current} of {total}',
    nextButton: 'Next',
    backButton: 'Back',
    submitButton: 'See Results',
    resultTitle: 'Your Matches',
    resultCount: '{N} licensed lenders matched your profile',
    confirmedBadge: 'Eligible',
    unconfirmedBadge: 'Eligibility unconfirmed — confirm with lender',
    noResultMessage: 'No lenders matched your profile exactly. Try browsing the full directory.',
    noResultAction: 'Browse all lenders',
    questions: {
      employment: {
        label: 'What is your current employment status?',
        salaried: 'Salaried employee',
        selfEmployed: 'Self-employed / Freelancer',
        unemployed: 'Unemployed',
      },
      income: {
        label: 'What is your approximate monthly income?',
        below10k: 'Below HK$10,000',
        from10kTo20k: 'HK$10,000 – $20,000',
        from20kTo50k: 'HK$20,000 – $50,000',
        above50k: 'Above HK$50,000',
      },
      loanAmount: {
        label: 'How much do you need to borrow?',
        below50k: 'Below HK$50,000',
        from50kTo200k: 'HK$50,000 – $200,000',
        from200kTo1m: 'HK$200,000 – $1,000,000',
        above1m: 'Above HK$1,000,000',
      },
      purpose: {
        label: 'What is the loan for?',
        personal: 'Personal loan',
        business: 'Business loan',
        mortgage: 'Mortgage',
        other: 'Other',
      },
      existingLoans: {
        label: 'Do you currently have any outstanding loans?',
        yes: 'Yes',
        no: 'No',
      },
    },
  },

  // ── Bookmarks (Story 7.2) ───────────────────────────────────────────────────
  bookmarks: {
    pageTitle: 'My Shortlist',
    addAriaLabel: 'Bookmark {name}',
    removeAriaLabel: 'Remove bookmark for {name}',
    removeButton: 'Remove',
    addAllToCompare: 'Add all to Compare',
    emptyTitle: 'No saved lenders',
    emptyDescription: 'You have not saved any lenders yet. Click ☆ on any lender to save.',
    emptyAction: 'Browse lenders',
  },

  // ── WhatsApp Share (Story 7.3) ──────────────────────────────────────────────
  whatsapp: {
    shareButton: 'Share on WhatsApp',
    shareAriaLabel: 'Share {name} via WhatsApp',
    shareText: '{name} — HK Lend Licensed Money Lender Directory\n{url}',
  },

  // ── Season Alert (Stories 7.4 / 7.5) ───────────────────────────────────────
  seasonAlert: {
    dismissAriaLabel: 'Dismiss alert',
    adminPageTitle: 'Season Alerts',
    adminNewButton: 'New Alert',
    adminEditTitle: 'Edit Alert',
    adminCreateTitle: 'New Alert',
    adminTableTitleCol: 'Title (TC)',
    adminTableDateRangeCol: 'Date Range',
    adminTableActiveCol: 'Active',
    adminTableActionsCol: 'Actions',
    adminDeleteConfirm: 'Delete this season alert?',
    adminSaveSuccess: 'Alert saved.',
    adminDeleteSuccess: 'Alert deleted.',
    formTitleZhLabel: 'Title (TC, required)',
    formTitleEnLabel: 'Title (EN, optional)',
    formBodyZhLabel: 'Body (TC, required)',
    formBodyEnLabel: 'Body (EN, optional)',
    formCtaLabelZhLabel: 'CTA label (TC, required)',
    formCtaLabelEnLabel: 'CTA label (EN, optional)',
    formCtaUrlLabel: 'CTA URL (internal path, e.g. /zh/lenders)',
    formStartDateLabel: 'Start date',
    formEndDateLabel: 'End date',
    formIsActiveLabel: 'Active',
  },
}
