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
  siteDescription: '免費查核香港持牌放債人牌照狀態，查看用戶評分，避免接觸無牌放債人。',

  // ── Scope banner ──────────────────────────────────────────────────────────
  scopeBanner: {
    text: 'HK Lend 核實牌照，不批核貸款',
    hkmaLink: '查閱公司註冊處官方名冊',
  },

  // ── Navigation ──────────────────────────────────────────────────────────────
  nav: {
    lenders: '放債人名冊',
    calculator: '供款試算',
    scamBoard: '詐騙警示板',
    news: '牌照動態',
    myShortlist: '我的收藏',
    language: 'English',
    homepageAriaLabel: 'HK Lend — 返回主頁',
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
      hkmaLink: '查閱公司註冊處放債人名冊',
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
    leavingSiteWarning: '您將離開 HK Lend，前往放債人網站。HK Lend 對該網站內容概不負責。',
    platformClarification:
      '您收到一個放債人核實連結 — HK Lend 為免費查牌工具，並非借貸平台',
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

  // ── APR Calculator ────────────────────────────────────────────────────────
  calculator: {
    title: '供款試算',
    loanAmount: '貸款金額 (HKD)',
    loanAmountPlaceholder: '例如 100,000',
    tenor: '還款期',
    tenorUnit: '個月',
    flatRate: '月平息',
    flatRateUnit: '% / 月',
    monthlyPayment: '每月供款',
    totalRepayable: '應還總額',
    apr: '實際年利率 (APR)',
    emptyResult: '—',
    useLenderRate: '使用此放債人最低利率',
    flatRateTooltipTitle: '月平息 vs 實際年利率',
    flatRateTooltipBody:
      '月平息（俗稱「月息」）按原始貸款金額計算每月利息，不反映本金逐月遞減的實際成本。實際年利率（APR）考慮到本金遞減因素，能更準確反映你的實際借貸成本。同一筆貸款，APR 通常是月平息的兩倍或以上。',
    shareWhatsApp: '分享 WhatsApp',
    shareText: '貸款 {amount}，還款期 {tenor} 個月 → 每月供款 {payment}，APR {apr}%',
    errorMin: '請輸入最小值 {min}',
    errorMax: '最大值為 {max}',
    errorRequired: '此欄必填',
  },

  // ── Compare tray ──────────────────────────────────────────────────────────
  compareTray: {
    maxReached: '最多可比較4間放債人',
    compareButton: '比較',
    removeAriaLabel: '移除 {name}',
  },

  // ── Comparison grid ───────────────────────────────────────────────────────
  compareGrid: {
    title: '放債人比較',
    emptyPrompt: '請先從名冊中選擇至少兩間放債人進行比較。',
    backToDirectory: '返回名冊',
    attributes: {
      company: '放債人',
      licenceStatus: '牌照狀態',
      district: '地區',
      loanTypes: '貸款類型',
      rateRange: '廣告利率（月平息）',
      apr: '實際年利率',
      tenor: '還款期（月）',
    },
    shareWhatsApp: '分享比較',
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

  // ── Quiz (Story 7.1) ────────────────────────────────────────────────────────
  quiz: {
    title: '適合我的放債人',
    description: '回答 5 條問題，幫你篩選最適合的持牌放債人。',
    progressLabel: '第 {current} 題，共 {total} 題',
    nextButton: '下一題',
    backButton: '上一題',
    submitButton: '查看結果',
    resultTitle: '配對結果',
    resultCount: '為你找到 {N} 間符合條件的持牌放債人',
    confirmedBadge: '符合條件',
    unconfirmedBadge: '資格待確認，請直接查詢',
    noResultMessage: '暫時找不到完全符合條件的放債人。建議直接瀏覽名冊。',
    noResultAction: '瀏覽全部放債人',
    questions: {
      employment: {
        label: '你目前的就業狀況？',
        salaried: '受薪僱員',
        selfEmployed: '自僱 / 自由工作者',
        unemployed: '待業 / 無業',
      },
      income: {
        label: '你的每月收入大約是？',
        below10k: '少於 $10,000',
        from10kTo20k: '$10,000 – $20,000',
        from20kTo50k: '$20,000 – $50,000',
        above50k: '多於 $50,000',
      },
      loanAmount: {
        label: '你需要借取的金額大約是？',
        below50k: '少於 $50,000',
        from50kTo200k: '$50,000 – $200,000',
        from200kTo1m: '$200,000 – $1,000,000',
        above1m: '多於 $1,000,000',
      },
      purpose: {
        label: '貸款用途是？',
        personal: '個人貸款',
        business: '商業貸款',
        mortgage: '物業按揭',
        other: '其他',
      },
      existingLoans: {
        label: '你目前有其他未還清的貸款嗎？',
        yes: '有',
        no: '沒有',
      },
    },
  },

  // ── Bookmarks (Story 7.2) ───────────────────────────────────────────────────
  bookmarks: {
    pageTitle: '我的收藏',
    addAriaLabel: '收藏 {name}',
    removeAriaLabel: '移除收藏 {name}',
    removeButton: '移除收藏',
    addAllToCompare: '全部加入比較',
    emptyTitle: '未有儲存的放債人',
    emptyDescription: '你未有儲存任何放債人。在名冊中點擊 ☆ 儲存。',
    emptyAction: '瀏覽放債人名冊',
  },

  // ── WhatsApp Share (Story 7.3) ──────────────────────────────────────────────
  whatsapp: {
    shareButton: '分享 WhatsApp',
    shareAriaLabel: '透過WhatsApp分享{name}',
    shareText: '{name} — HK Lend 持牌放債人名冊\n{url}',
  },

  // ── Season Alert (Stories 7.4 / 7.5) ───────────────────────────────────────
  seasonAlert: {
    dismissAriaLabel: '關閉通知',
    adminPageTitle: '季節性通告',
    adminNewButton: '新增通告',
    adminEditTitle: '編輯通告',
    adminCreateTitle: '新增通告',
    adminTableTitleCol: '標題（中文）',
    adminTableDateRangeCol: '日期範圍',
    adminTableActiveCol: '啟用',
    adminTableActionsCol: '操作',
    adminDeleteConfirm: '確定刪除此通告？',
    adminSaveSuccess: '通告已儲存。',
    adminDeleteSuccess: '通告已刪除。',
    formTitleZhLabel: '標題（中文，必填）',
    formTitleEnLabel: '標題（英文，選填）',
    formBodyZhLabel: '內文（中文，必填）',
    formBodyEnLabel: '內文（英文，選填）',
    formCtaLabelZhLabel: 'CTA 按鈕文字（中文，必填）',
    formCtaLabelEnLabel: 'CTA 按鈕文字（英文，選填）',
    formCtaUrlLabel: 'CTA 連結（內部路徑，如 /zh/lenders）',
    formStartDateLabel: '開始日期',
    formEndDateLabel: '結束日期',
    formIsActiveLabel: '立即啟用',
  },

  // ── Borrower Authentication (Story 8.1) ────────────────────────────────────
  auth: {
    signIn: {
      title: '登入 HK Lend',
      emailLabel: '電郵地址',
      emailPlaceholder: 'your@email.com',
      submit: '傳送登入連結',
      readAnonymously: '先繼續瀏覽',
      turnstileError: '人機驗證失敗，請重試。',
      rateLimitError: '請求次數過多，請稍後再試。',
      emailServiceDown: '電郵服務暫時無法使用，請稍後再試。',
    },
    sent: {
      title: '請查收電郵',
      body: '如果此電郵地址可以登入，我們已經傳送一個登入連結給你。連結將於 15 分鐘後失效。',
      resend: '重新傳送',
      resendSuccess: '已重新傳送，請查收電郵。',
    },
    expired: {
      title: '連結已失效',
      body: '此登入連結已被使用或已過期，請重新索取一個新連結。',
      resend: '重新傳送登入連結',
    },
    prompt: {
      title: '登入以繼續',
      defaultReason: '繼續操作前需要登入',
      successMessage: '已寄出登入連結，請查收電郵。',
      smokeTriggerLabel: '預覽：登入提示彈窗',
      reasonWriteReview: '撰寫評論需要登入',
      reasonReportReview: '舉報評論需要登入',
      reasonRedFlag: '提交紅旗標記需要登入',
      reasonScamReport: '舉報詐騙需要登入',
      reasonVote: '投票需要登入',
    },
    email: {
      subject: 'hklend 登入連結',
      greeting: '你好，',
      linkCta: '登入 hklend',
      expiryLine: '此連結將於 15 分鐘後失效。',
      ignoreIfNotYou: '如果這不是你本人操作，可以安全地忽略此電郵。',
      enToggleLine: "This email is in Traditional Chinese. If you'd prefer English, request a new sign-in link after switching the language on hklend.hk.",
    },
    signOut: {
      button: '登出',
    },
    account: {
      title: '我的帳戶',
      emailLabel: '電郵地址',
      emailLocked: '本站不支援更改電郵。如需更換，請先刪除帳戶再以新電郵登記。',
      displayNameLabel: '顯示名稱',
      displayNameSave: '儲存',
      displayNameSaved: '已儲存',
      displayNameError: '儲存失敗，請重試。顯示名稱須為 1 至 20 個字。',
      createdAtLabel: '註冊日期',
      signOut: '登出',
      deleteAccount: '刪除帳戶',
      deletion: {
        title: '刪除帳戶',
        body: '刪除帳戶後，你的評論、紅旗標記及詐騙舉報將會保留（供其他用戶及管理員參考），但會顯示為「匿名用戶」，並與你的身分脫鈎。此操作無法復原。',
        confirmLabel: '請輸入你的電郵地址以確認',
        confirmButton: '永久刪除我的帳戶',
        cancel: '取消',
        mismatchError: '電郵地址不符，請重新輸入。',
        internalError: '系統發生錯誤，請稍後再試。如問題持續，請聯絡管理員。',
        unauthorizedError: '登入狀態已過期，請重新登入後再試。',
        deletedToast: '你的帳戶已刪除。',
      },
    },
    vote: {
      upvote: '有用',
      removeVote: '取消讚好',
      selfDisabled: '不能為自己的內容投票',
    },
  },
}
