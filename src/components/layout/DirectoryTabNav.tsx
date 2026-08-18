'use client'

import { usePathname } from 'next/navigation'
import type { Locale } from '@/locales'

interface DirectoryTabNavProps {
  locale: Locale
}

export function DirectoryTabNav({ locale }: DirectoryTabNavProps) {
  const pathname = usePathname()
  const isZh = locale === 'zh'

  const tabs = [
    { labelZh: '首頁', labelEn: 'Home', href: `/${locale}` },
    { labelZh: '放債人名冊', labelEn: 'Lender Registry', href: `/${locale}/lenders` },
  ]

  const isHome = pathname === `/${locale}`

  return (
    <div className={isHome ? 'bg-[#264a58]' : 'border-b border-gray-200 bg-white'}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <nav className="flex" aria-label={isZh ? '頁面導航' : 'Page navigation'}>
          {tabs.map(tab => {
            const isActive = pathname === tab.href || (tab.href !== `/${locale}` && pathname.startsWith(tab.href))
            return (
              <a
                key={tab.href}
                href={tab.href}
                className={`
                  relative px-4 py-3 text-sm font-medium transition-colors
                  ${isHome
                    ? isActive
                      ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white'
                      : 'text-white/60 hover:text-white/90'
                    : isActive
                      ? 'text-[#264a58] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#264a58]'
                      : 'text-gray-500 hover:text-[#264a58]'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {isZh ? tab.labelZh : tab.labelEn}
              </a>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
