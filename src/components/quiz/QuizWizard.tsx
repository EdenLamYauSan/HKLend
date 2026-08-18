/**
 * QuizWizard — 5-question approval probability quiz (Story 7.1).
 *
 * 'use client': all quiz state + filtering logic is client-side.
 * No server call after initial page load — lender dataset is pre-fetched
 * by the Server Component parent and passed as a prop.
 *
 * Filter logic (AC-2):
 *   Primary tier  — licenceStatus = ACTIVE AND eligibilityTags includes
 *                   the user's employment type from Q1.
 *   Secondary tier — ACTIVE lenders with empty eligibilityTags[].
 *   Hidden        — ACTIVE lenders whose eligibilityTags explicitly excludes
 *                   the employment type AND length > 0.
 *   Within each tier: sorted by averageRating DESC (3+ reviews required);
 *                     unrated lenders sort last within their tier.
 *
 * Employment tag mapping:
 *   'salaried'    → 'employed'
 *   'selfEmployed'→ 'self-employed'
 *   'unemployed'  → 'unemployed'
 */

'use client'

import { useState } from 'react'
import type { Translation } from '@/locales/types'
import { LicenceBadge } from '@/components/directory/LicenceBadge'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuizLenderData {
  slug: string
  companyNameZh: string
  companyNameEn: string | null
  licenceStatus: string
  eligibilityTags: string[]
  loanTypeTags: string[]
  interestRateMin: number | null
  interestRateMax: number | null
  averageRating: number | null    // null when fewer than 3 reviews
  reviewCount: number
}

type EmploymentAnswer = 'salaried' | 'selfEmployed' | 'unemployed'
type IncomeAnswer = 'below10k' | 'from10kTo20k' | 'from20kTo50k' | 'above50k'
type LoanAmountAnswer = 'below50k' | 'from50kTo200k' | 'from200kTo1m' | 'above1m'
type PurposeAnswer = 'personal' | 'business' | 'mortgage' | 'other'
type ExistingLoansAnswer = 'yes' | 'no'

interface QuizAnswers {
  employment: EmploymentAnswer | null
  income: IncomeAnswer | null
  loanAmount: LoanAmountAnswer | null
  purpose: PurposeAnswer | null
  existingLoans: ExistingLoansAnswer | null
}

// ─── Employment tag mapping ───────────────────────────────────────────────────

const EMPLOYMENT_TO_TAG: Record<EmploymentAnswer, string> = {
  salaried: 'employed',
  selfEmployed: 'self-employed',
  unemployed: 'unemployed',
}

// ─── Filter logic ─────────────────────────────────────────────────────────────

function filterLenders(
  lenders: QuizLenderData[],
  employment: EmploymentAnswer
): { confirmed: QuizLenderData[]; unconfirmed: QuizLenderData[] } {
  const tag = EMPLOYMENT_TO_TAG[employment]
  const activeLenders = lenders.filter(l => l.licenceStatus === 'ACTIVE')

  const sortByRating = (a: QuizLenderData, b: QuizLenderData): number => {
    // 3+ reviews required to rank; null sorts after non-null
    if (a.averageRating !== null && b.averageRating !== null) {
      return b.averageRating - a.averageRating
    }
    if (a.averageRating !== null) return -1
    if (b.averageRating !== null) return 1
    return 0
  }

  const confirmed = activeLenders
    .filter(l => l.eligibilityTags.includes(tag))
    .sort(sortByRating)

  const unconfirmed = activeLenders
    .filter(l => l.eligibilityTags.length === 0)
    .sort(sortByRating)

  // Lenders with non-empty eligibilityTags that don't include the tag are hidden.
  return { confirmed, unconfirmed }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface QuizWizardProps {
  lenders: QuizLenderData[]
  locale: 'zh' | 'en'
  t: Translation
}

const TOTAL_STEPS = 5

export function QuizWizard({ lenders, locale, t }: QuizWizardProps) {
  const [step, setStep] = useState<number>(1)  // 1-5 = questions; 6 = results
  const [answers, setAnswers] = useState<QuizAnswers>({
    employment: null,
    income: null,
    loanAmount: null,
    purpose: null,
    existingLoans: null,
  })

  const isZh = locale === 'zh'
  const q = t.quiz

  // ── Navigation helpers ────────────────────────────────────────────────────

  function setAnswer<K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  function canProceed(): boolean {
    switch (step) {
      case 1: return answers.employment !== null
      case 2: return answers.income !== null
      case 3: return answers.loanAmount !== null
      case 4: return answers.purpose !== null
      case 5: return answers.existingLoans !== null
      default: return false
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1)
    } else {
      setStep(TOTAL_STEPS + 1)  // show results
    }
  }

  function handleBack() {
    if (step > 1) setStep(s => s - 1)
  }

  // ── Progress label ────────────────────────────────────────────────────────

  const progressLabel = q.progressLabel
    .replace('{current}', String(step))
    .replace('{total}', String(TOTAL_STEPS))

  // ── Shared option button ──────────────────────────────────────────────────

  function OptionButton({
    value,
    selected,
    label,
    onClick,
  }: {
    value: string
    selected: boolean
    label: string
    onClick: () => void
  }) {
    return (
      <button
        key={value}
        type="button"
        onClick={onClick}
        className={`
          w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium
          transition-colors focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-primary
          ${selected
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border bg-white text-muted-foreground hover:border-primary/30'}
        `}
        aria-pressed={selected}
      >
        {label}
      </button>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────

  if (step === TOTAL_STEPS + 1) {
    const { confirmed, unconfirmed } = filterLenders(lenders, answers.employment!)
    const total = confirmed.length + unconfirmed.length

    const countText = q.resultCount.replace('{N}', String(total))

    function LenderResultCard({
      lender,
      badge,
    }: {
      lender: QuizLenderData
      badge?: string
    }) {
      const name = isZh
        ? lender.companyNameZh
        : (lender.companyNameEn ?? lender.companyNameZh)

      const rateStr =
        lender.interestRateMin != null && lender.interestRateMax != null
          ? `${lender.interestRateMin}% – ${lender.interestRateMax}%`
          : null

      return (
        <li className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <a
            href={`/${locale}/lenders/${lender.slug}`}
            className="flex flex-col gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-primary">{name}</p>
              <LicenceBadge licenceStatus={lender.licenceStatus} locale={locale} size="sm" />
            </div>

            {rateStr && (
              <p className="text-sm text-muted-foreground">{rateStr}</p>
            )}

            {lender.averageRating !== null && (
              <p className="text-sm text-muted-foreground">
                {'★'.repeat(Math.round(lender.averageRating))}
                {'☆'.repeat(5 - Math.round(lender.averageRating))}
                {' '}
                ({lender.reviewCount})
              </p>
            )}

            {badge && (
              <p className="text-xs text-muted-foreground">{badge}</p>
            )}
          </a>
        </li>
      )
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-primary">{q.resultTitle}</h2>
          {total > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">{countText}</p>
          )}
        </div>

        {total === 0 ? (
          <div className="rounded-xl border border-border bg-white p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{q.noResultMessage}</p>
            <a
              href={`/${locale}/lenders`}
              className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {q.noResultAction}
            </a>
          </div>
        ) : (
          <ul className="space-y-3">
            {confirmed.map(l => (
              <LenderResultCard key={l.slug} lender={l} badge={q.confirmedBadge} />
            ))}
            {unconfirmed.map(l => (
              <LenderResultCard key={l.slug} lender={l} badge={q.unconfirmedBadge} />
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => { setStep(1); setAnswers({ employment: null, income: null, loanAmount: null, purpose: null, existingLoans: null }) }}
          className="text-sm text-primary underline underline-offset-4 hover:no-underline"
        >
          {isZh ? '重新作答' : 'Start again'}
        </button>
      </div>
    )
  }

  // ── Questions ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div>
        <p className="text-xs text-muted-foreground">{progressLabel}</p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={0}
            aria-valuemax={TOTAL_STEPS}
          />
        </div>
      </div>

      {/* Question 1: Employment */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-base font-medium text-primary">{q.questions.employment.label}</p>
          <div className="space-y-2">
            {(['salaried', 'selfEmployed', 'unemployed'] as EmploymentAnswer[]).map(v => (
              <OptionButton
                key={v}
                value={v}
                selected={answers.employment === v}
                label={q.questions.employment[v]}
                onClick={() => setAnswer('employment', v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Question 2: Income */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-base font-medium text-primary">{q.questions.income.label}</p>
          <div className="space-y-2">
            {(['below10k', 'from10kTo20k', 'from20kTo50k', 'above50k'] as IncomeAnswer[]).map(v => (
              <OptionButton
                key={v}
                value={v}
                selected={answers.income === v}
                label={q.questions.income[v]}
                onClick={() => setAnswer('income', v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Question 3: Loan amount */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-base font-medium text-primary">{q.questions.loanAmount.label}</p>
          <div className="space-y-2">
            {(['below50k', 'from50kTo200k', 'from200kTo1m', 'above1m'] as LoanAmountAnswer[]).map(v => (
              <OptionButton
                key={v}
                value={v}
                selected={answers.loanAmount === v}
                label={q.questions.loanAmount[v]}
                onClick={() => setAnswer('loanAmount', v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Question 4: Purpose */}
      {step === 4 && (
        <div className="space-y-3">
          <p className="text-base font-medium text-primary">{q.questions.purpose.label}</p>
          <div className="space-y-2">
            {(['personal', 'business', 'mortgage', 'other'] as PurposeAnswer[]).map(v => (
              <OptionButton
                key={v}
                value={v}
                selected={answers.purpose === v}
                label={q.questions.purpose[v]}
                onClick={() => setAnswer('purpose', v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Question 5: Existing loans */}
      {step === 5 && (
        <div className="space-y-3">
          <p className="text-base font-medium text-primary">{q.questions.existingLoans.label}</p>
          <div className="space-y-2">
            {(['yes', 'no'] as ExistingLoansAnswer[]).map(v => (
              <OptionButton
                key={v}
                value={v}
                selected={answers.existingLoans === v}
                label={q.questions.existingLoans[v]}
                onClick={() => setAnswer('existingLoans', v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between gap-3 pt-2">
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {q.backButton}
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {step === TOTAL_STEPS ? q.submitButton : q.nextButton}
        </button>
      </div>
    </div>
  )
}
