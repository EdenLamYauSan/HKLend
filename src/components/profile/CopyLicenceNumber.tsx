'use client'

import { useState } from 'react'

interface Props {
  licenceNumber: string
}

export function CopyLicenceNumber({ licenceNumber }: Props) {
  const [copied, setCopied] = useState(false)

  function handleClick() {
    navigator.clipboard.writeText(licenceNumber).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleClick}
      className="font-mono text-sm text-[#264a58] hover:underline cursor-pointer"
      aria-label={copied ? '已複製' : '點擊複製牌照號碼'}
      title={copied ? '已複製' : '點擊複製'}
    >
      {licenceNumber}
      {copied && (
        <span className="ml-1 text-green-600 text-xs" aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  )
}
