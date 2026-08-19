'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import type { Locale } from '@/locales'

interface DirectoryTabNavProps {
  locale: Locale
}

export function DirectoryTabNav({ locale }: DirectoryTabNavProps) {
  const pathname = usePathname()
  const isZh = locale === 'zh'

  const tabs = [
    { labelZh: '首頁', labelEn: 'Home', href: `/${locale}` },
    { labelZh: '放債人名冊', labelEn: 'Registry', href: `/${locale}/lenders` },
    { labelZh: '新聞', labelEn: 'News', href: `/${locale}/news` },
    { labelZh: '計算機', labelEn: 'Calc', href: `/${locale}/calculator` },
    { labelZh: '部落格', labelEn: 'Blog', href: `/${locale}/blog` },
    { labelZh: '討論區', labelEn: 'Forum', href: `/${locale}/forum` },
  ]

  const isHome = pathname === `/${locale}`

  return (
    <div className={isHome ? 'bg-brand-navy' : 'border-b border-border bg-white'}>
      <nav className="flex w-full" aria-label={isZh ? '頁面導航' : 'Page navigation'}>
        {tabs.map(tab => {
          const isActive = pathname === tab.href || (tab.href !== `/${locale}` && pathname.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                relative flex-1 text-center py-3 text-xs font-medium transition-colors
                ${isHome
                  ? isActive
                    ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white'
                    : 'text-white/60 hover:text-white/90'
                  : isActive
                    ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                    : 'text-muted-foreground hover:text-primary'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {isZh ? tab.labelZh : tab.labelEn}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
