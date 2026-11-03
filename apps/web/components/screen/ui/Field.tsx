'use client'

import { cloneElement, forwardRef, isValidElement, useId } from 'react'

// ── Form field + controls (Screen design system) ───────────────────────────
// <Field label hint error required> wraps ONE control and wires up htmlFor,
// aria-describedby and aria-invalid automatically. Controls are thin wrappers
// over native elements — all native props/events pass straight through, so
// adopting them never changes form behaviour.

export function Field({ label, hint, error, required, children, className, style }: {
  label?: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; required?: boolean
  children: React.ReactElement; className?: string; style?: React.CSSProperties
}) {
  const uid = useId()
  const id = (children.props as { id?: string }).id ?? `lv-f-${uid}`
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  const describedBy = [hintId, errId, (children.props as { 'aria-describedby'?: string })['aria-describedby']].filter(Boolean).join(' ') || undefined
  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : (children.props as Record<string, unknown>)['aria-invalid'], required: required ?? (children.props as { required?: boolean }).required })
    : children
  return (
    <div className={['lv-field', className].filter(Boolean).join(' ')} style={style}>
      {label && <label htmlFor={id} className="lv-label">{label}{required && <span className="lv-req" aria-hidden="true">*</span>}</label>}
      {control}
      {hint && !error && <span id={hintId} className="lv-hint">{hint}</span>}
      {error && <span id={errId} className="lv-error" role="alert">{error}</span>}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={['lv-input', className].filter(Boolean).join(' ')} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return <select ref={ref} className={['lv-select', className].filter(Boolean).join(' ')} {...rest}>{children}</select>
})

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={['lv-textarea', className].filter(Boolean).join(' ')} {...rest} />
})
