/**
 * src/locales/zh.ts — Traditional Chinese (TC) locale strings.
 *
 * UX-DR25: Copy written directly in HK Cantonese-influenced written Chinese.
 * NOT a translation from English — this is the source copy.
 * TC is the canonical locale (ARCH-9).
 */

import type { Translation } from './types'

export const zh: Translation = {
  // ── Site meta ──────────────────────────────────────────────────────────────
  siteName: 'HK Lend',
  siteTagline: '核實牌照，免費查牌',
  siteDescription: '免費查核香港持牌放債人牌照狀態，睇用家評分，避免接觸無牌放債人。',

  // ── Scope banner ──────────────────────────────────────────────────────────
  scopeBanner: {
    text: 'hklend 核實牌照，唔批貸款',
    hkmaLink: '查閱金管局官方名冊',
  },

  // ── Navigation ──────────────────────────────────────────────────────────────
  nav: {
    lenders: '放債人名冊',
    calculator: '供款試算',
    scamBoard: '詐騙警示板',
    news: '牌照動態',
    myShortlist: '我的收藏',
    language: 'English',
    homepageAriaLabel: 'hklend — 返回主頁',
  },

  // ── Common actions ──────────────────────────────────────────────────────────
  actions: {
    search: '搜尋',
    filter: '篩選',
    clear: '清除',
    close: '關閉',
    cancel: '取消',
    save: '儲存',
    submit: '提交',
    confirm: '確認',
    back: '返回',
    loadMore: '載入更多',
    share: '分享',
    compare: '比較',
    addToCompare: '加入比較',
    removeFromCompare: '移除比較',
    bookmark: '收藏',
    removeBookmark: '移除收藏',
    viewAll: '查看全部',
    copyLink: '複製連結',
    apply: '申請',
    enquire: '查詢',
  },

  // ── Error states ────────────────────────────────────────────────────────────
  errors: {
    notFound: '找不到此頁面',
    notFoundDescription: '你所查閱的頁面不存在或已被移除。',
    serverError: '系統出現問題',
    serverErrorDescription: '請稍後再試。如問題持續，請聯絡我們。',
    networkError: '網絡連接失敗，請檢查網絡後重試。',
    validationError: '請檢查輸入內容是否正確。',
    rateLimited: '提交次數過多',
    rateLimitedDescription: '你已超出提交限制，請稍後再試。',
    turnstileFailed: '人機驗證失敗，請重試。',
    unauthorized: '請先登入。',
  },

  // ── Empty states ────────────────────────────────────────────────────────────
  emptyStates: {
    noResults: '找不到相關結果',
    noReviews: '暫時未有評論。成為第一個分享經驗的人。',
    noReviewsAction: '撰寫評論',
    noFlags: '暫時未有標記',
    noNews: '暫時未有最新動態',
    noActivity: '暫時未有牌照異動記錄',
  },

  // ── Lender directory ────────────────────────────────────────────────────────
  lenders: {
    title: '持牌放債人名冊',
    searchPlaceholder: '搜尋牌照號碼或公司名稱',
    filterByDistrict: '按地區篩選',
    filterByLoanType: '按貸款類型篩選',
    sortByName: '按名稱排列（A→Z）',
    sortByNewest: '按登記日期（最新）',
    totalCount: '共 {n} 間',
    card: {
      eligibilityUnconfirmed: '資格待確認，請直接查詢',
      registrationNumber: '牌照號碼',
      visitWebsite: '瀏覽網站',
      applyEnquire: '申請 / 查詢',
      applyDisclaimer: '你將離開 HK Lend 前往放債人網站',
      moreTypes: '+ {n} 項',
    },
    zeroResult: {
      title: '此名稱並未在放債人登記冊登記',
      description:
        '官方名冊以公司全名登記。貿易名稱或品牌名稱可能與登記名稱不同，建議以全名搜尋。',
      hkmaLink: '查閱金管局官方放債人名冊',
      retrySearch: '重新搜尋',
      viewScamBoard: '查看詐騙警示板',
    },
  },

  // ── Lender profile ──────────────────────────────────────────────────────────
  profile: {
    licenceInfo: '牌照資料',
    licenceNumber: '牌照號碼',
    licenceStatus: '牌照狀態',
    licenceVerified: '核實日期',
    address: '登記地址',
    district: '地區',
    phone: '電話',
    website: '網址',
    loanTypes: '貸款類型',
    eligibleFor: '適合申請人士',
    eligibilityUnconfirmed: '資格待確認，請直接查詢',
    adminNote: '編輯備注',
    rateInfo: '廣告利率',
    contactForRates: '請向放債人查詢利率',
    lenderPulse: '放債人動態',
    activityFeed: '牌照異動記錄',
    activityFeedTitle: '牌照異動記錄',
    activityFeedExpand: '查看全部 {n} 條記錄',
    reviews: '用家評論',
    writeReview: '撰寫評論',
    redFlags: '用家標記',
    submitFlag: '提交標記',
  },

  // ── Licence badge ──────────────────────────────────────────────────────────
  licenceBadge: {
    active: '有效牌照',
    suspended: '暫停',
    revoked: '撤銷',
    ariaLabel: '牌照狀態：{status}',
    lastVerified: '最後核實：{date}',
  },

  // ── Reviews ─────────────────────────────────────────────────────────────────
  reviews: {
    approvalSpeed: '審批速度',
    rateAccuracy: '利率準確性',
    staffAttitude: '職員態度',
    transparency: '透明度',
    overallRating: '整體評分',
    anonymous: '匿名',
    pending: '審核中',
    writeTitle: '撰寫評論',
    bodyPlaceholder: '分享你的申請或借款經歷（50–500 字）',
    nameLabel: '顯示名稱（選填）',
    namePlaceholder: '最多 20 個字',
    successMessage: '感謝你的評論！待審核後公開。',
    minReviewsRequired: '暫未有評分',
    reviewCount: '{n} 則評論',
    helpful: '有用',
    notHelpful: '沒用',
    report: '檢舉評論',
    trendUp: '↑ 近期評分上升',
    trendDown: '↓ 近期評分下降',
  },

  // ── Data attribution ──────────────────────────────────────────────────────
  dataSource: {
    attribution: '資料來源：香港公司登記冊',
    lastChecked: '最後檢查：{date}',
    freshnessLabel: '資料來源：香港公司登記冊 · 最後檢查：{date}',
  },

  // ── Legal ─────────────────────────────────────────────────────────────────
  legal: {
    disclaimer:
      'HK Lend 僅供資訊參考，不構成財務建議。所有貸款決定請自行評估。',
    scamBoardDisclaimer:
      '以下為用戶提交並經審核的檢舉，非由香港司法機構核實。',
    leavingSiteWarning: '你將離開 HK Lend，前往放債人網站。HK Lend 對該網站內容概不負責。',
    platformClarification:
      '你收到一個放債人核實連結 — HK Lend 係免費查牌工具，唔係借貸平台',
  },

  // ── Flags (UX-DR8, FR-39) ─────────────────────────────────────────────────
  flags: {
    sectionTitle: '用家標記',
    submitButton: '舉報問題',
    modalTitle: '舉報此放債人',
    legalDisclaimer:
      '此舉報並非法律投訴，HK Lend 不提供法律建議。如有緊急情況，請聯絡警方。',
    categoryLabel: '舉報類別',
    detailsLabel: '詳細描述（選填）',
    detailsPlaceholder: '請描述你遇到的問題（最多 500 字）',
    detailsCharCount: '{n}/500 字',
    successMessage: '已收到你的標記，我們將於 48 小時內審核。',
    warningBanner:
      '此放債人在過去 90 天內收到多宗投訴，請謹慎考慮。',
    risingComplaints: '近期投訴上升',
    categories: {
      HARASSMENT: '恐嚇或騷擾',
      ILLEGAL_TERMS: '隱藏收費或不合理條款',
      FAKE_IDENTITY: '冒充持牌放債人',
      OVERCHARGING: '利率或收費與廣告不符',
      OTHER: '其他問題',
    },
  },

  // ── Scam board (FR-31–FR-34) ──────────────────────────────────────────────
  scamBoard: {
    pageTitle: '詐騙警示板',
    pageDescription:
      '查看用戶提交並經審核的詐騙警告，保護自己免受冒牌放債人侵害。',
    hkpfLink: '香港警察防騙資訊',
    submitButton: '舉報詐騙',
    searchPlaceholder: '搜尋公司名稱或電話',
    legalDisclaimer:
      '以下舉報由用戶提交，HK Lend 已進行基本核實但不保證內容準確性。如懷疑詐騙，請向警方舉報。',
    emptyState: '目前沒有已核實的詐騙舉報。如遇可疑放債人，請舉報。',
    reportCount: '{n} 宗已核實舉報',
    form: {
      companyNameLabel: '公司或個人名稱',
      companyNamePlaceholder: '被舉報的公司或個人名稱',
      licenceLabel: '對方聲稱的牌照號碼（選填）',
      licencePlaceholder: '例如：ML/XXXXXXXX/YYYY',
      incidentDateLabel: '事發日期（選填）',
      lossAmountLabel: '估計損失金額（港元，選填）',
      evidenceLabel: '詳細描述',
      evidencePlaceholder: '請詳細描述事件經過、可疑行為及任何相關資料（100–2000 字）',
      evidenceCharCount: '{n}/2000 字',
      successMessage: '感謝你的舉報！我們將盡快審核。',
      legalDisclaimer:
        '提交舉報即表示你確認所提供資料真實，並了解虛假舉報可能承擔法律責任。',
    },
    card: {
      verifiedLabel: '已核實',
      licenceClaimed: '聲稱牌照號碼',
      incidentDate: '事發日期',
      estimatedLoss: '估計損失',
      readMore: '閱讀全文',
      showLess: '收起',
    },
  },

  // ── Captcha ───────────────────────────────────────────────────────────────
  captcha: {
    verifying: '驗證中…',
    failed: '人機驗證失敗，請重試。',
  },

  // ── News feed ─────────────────────────────────────────────────────────────
  news: {
    pageTitle: '牌照動態',
    pageDescription: '最新香港放債人監管消息及行業動態',
    empty: '暫時未有消息。請稍後再查。',
    translationUnavailable: '英文版本暫未提供，以下為中文原文。',
    relatedLenders: '相關放債人',
    categories: {
      regulatory: '監管消息',
      industry: '行業動態',
      enforcement: '執法行動',
      general: '一般消息',
    },
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  admin: {
    loginTitle: '管理員登入',
    passwordLabel: '密碼',
    loginButton: '登入',
    loginError: '密碼錯誤，請重試。',
    dashboard: '主頁',
    lenders: '放債人管理',
    reviews: '評論審核',
    flags: '標記審核',
    scamBoard: '詐騙記錄管理',
    news: '新聞草稿',
    scraperRuns: '爬蟲記錄',
    seasonAlerts: '季節性通告',
    logoutButton: '登出',
    noPermission: '你沒有權限查閱此頁面。',
  },
}
