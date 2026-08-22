'use client'

import { useEffect } from 'react'

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'

let initialized = false

export function PostHogProvider() {
  useEffect(() => {
    if (initialized || !KEY) return
    import('posthog-js').then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        capture_pageview: 'history_change',
        capture_pageleave: true,
        person_profiles: 'always',
      })
      initialized = true
    })
  }, [])

  return null
}
