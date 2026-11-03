'use client'

import { useCallback, useRef, useState } from 'react'
import { Modal } from './Overlay'
import { ActionBar } from './Layout'
import { Button } from './Button'

// ── Confirm dialog (Screen design system, Pass 5) ──────────────────────────
// Promise-based replacement for window.confirm():
//   const [confirm, confirmDialog] = useConfirm()
//   if (!(await confirm({ title: 'Revoke key?', confirmLabel: 'Revoke', destructive: true }))) return
//   …render {confirmDialog} once in the component.
// Esc / backdrop / Cancel resolve false; the confirm button resolves true.

export interface ConfirmOptions {
  title: React.ReactNode
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export function useConfirm(): [(opts: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => {
    resolver.current?.(false)
    resolver.current = resolve
    setOpts(o)
  }), [])

  const settle = useCallback((v: boolean) => {
    resolver.current?.(v)
    resolver.current = null
    setOpts(null)
  }, [])

  const dialog = (
    <Modal open={!!opts} onClose={() => settle(false)} size="sm" title={opts?.title ?? ''} description={opts?.description}
      footer={<ActionBar>
        <Button variant="secondary" onClick={() => settle(false)}>{opts?.cancelLabel ?? 'Cancel'}</Button>
        <Button variant={opts?.destructive ? 'destructive' : 'primary'} onClick={() => settle(true)}>{opts?.confirmLabel ?? 'Confirm'}</Button>
      </ActionBar>} />
  )
  return [confirm, dialog]
}
