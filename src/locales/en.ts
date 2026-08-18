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
    hkmaLink: 'View HKMA official directory',
  },

  // ── Navigation ──────────────────────────────────────────────────────────────
  nav: {
    lenders: 'Lender Directory',
    calculator: 'APR Calculator',
    scamBoard: 'Scam Board',
    news: 'Licence Updates',
    myShortlist: 'My Shortlist',
    language: '中文',
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
      hkmaLink: 'View HKMA official Money Lenders Register',
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

  // ── Captcha ───────────────────────────────────────────────────────────────
  captcha: {
    verifying: 'Verifying…',
    failed: 'Human verification failed. Please try again.',
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
}
