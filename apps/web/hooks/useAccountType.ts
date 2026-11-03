'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { effectiveAccountType, isAccountType, type AccountType } from '@/lib/screen/account-type'

// ── useAccountType — single source of truth for agency vs in-house UI ──────
// Reads the CURRENT persisted Agency.accountType from the app store. The first
// caller on a page loads it from /api/auth/me (one shared request); Settings
// writes the store right after saving, so every agency/company conditional
// (Clients tab, client-company field, contact labels, prompts) re-renders
// immediately — no hard refresh.

let inflight: Promise<void> | null = null

export function loadAccount(force = false): Promise<void> {
  const { account, setAccount } = useAppStore.getState()
  if (account && !force) return Promise.resolve()
  if (inflight && !force) return inflight
  inflight = fetch('/api/auth/me', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d?.agency) setAccount({ type: isAccountType(d.agency.accountType) ? d.agency.accountType : null, orgName: d.agency.name ?? '' })
    })
    .catch(() => {})
    .finally(() => { inflight = null })
  return inflight
}

export function useAccountType(): { type: AccountType; raw: AccountType | null; loaded: boolean; isCompany: boolean; orgName: string } {
  const account = useAppStore((s) => s.account)
  useEffect(() => { if (!account) void loadAccount() }, [account])
  const raw = account?.type ?? null
  const type = effectiveAccountType(raw)
  return { type, raw, loaded: !!account, isCompany: type === 'company', orgName: account?.orgName ?? '' }
}
