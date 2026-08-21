'use client'

interface Props {
  label: string
}

export function CalcTriggerButton({ label }: Props) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('hklend:openCalc'))}
      className="md:hidden inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary min-h-[44px] transition-colors"
    >
      {label}
    </button>
  )
}
