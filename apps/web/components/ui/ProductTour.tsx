'use client'

import { useEffect, useRef } from 'react'

const TOUR_KEY = 'levl1_tour_completed'

const TOUR_STEPS = [
  {
    id:      'welcome',
    title:   'Welcome to Levl1!',
    text:    'This quick tour shows you how to run your first AI interview in under 5 minutes. You can skip at any time.',
    attachTo: { element: '[data-tour="logo"]', on: 'right' as const },
  },
  {
    id:      'positions',
    title:   'Start here — Positions',
    text:    'Create a position by adding a job description and tech stack. Claude AI generates tailored interview questions automatically.',
    attachTo: { element: '[data-tour="nav-positions"]', on: 'right' as const },
  },
  {
    id:      'approval',
    title:   'Question Approval',
    text:    'Before any interview begins, your tech lead and HR must approve the questions — once. Every candidate for this position uses the same approved set.',
    attachTo: { element: '[data-tour="positions-approval"]', on: 'bottom' as const },
  },
  {
    id:      'candidates',
    title:   'Upload Candidates',
    text:    'Upload candidate resumes here — PDF, Word, or paste text. AI extracts contact details and skills automatically.',
    attachTo: { element: '[data-tour="nav-candidates"]', on: 'right' as const },
  },
  {
    id:      'invite',
    title:   'Send Interview Invites',
    text:    'Once candidates are added, send them a scheduling link. They pick their own time slot — no back and forth needed.',
    attachTo: { element: '[data-tour="nav-candidates"]', on: 'right' as const },
  },
  {
    id:      'interviews',
    title:   'Monitor Live Interviews',
    text:    'Monitor live interviews here. The AI interviewer handles everything — you just watch the transcript and scores update in real time.',
    attachTo: { element: '[data-tour="nav-interviews"]', on: 'right' as const },
  },
  {
    id:      'reports',
    title:   'Evidence-Based Reports',
    text:    'After each interview, get an evidence-based report with scores, strengths, concerns, and a clear recommendation. Candidates are ranked automatically.',
    attachTo: { element: '[data-tour="nav-reports"]', on: 'right' as const },
  },
  {
    id:      'done',
    title:   "You're ready!",
    text:    "Create your first position to get started. It takes about 3 minutes.",
    attachTo: { element: '[data-tour="new-position"]', on: 'right' as const },
  },
]

export function ProductTour({ onOpenNewPosition }: { onOpenNewPosition: () => void }) {
  const tourRef = useRef<unknown>(null)

  useEffect(() => {
    // Don't run on server; check localStorage
    if (typeof window === 'undefined') return
    if (localStorage.getItem(TOUR_KEY)) return

    let cancelled = false

    async function startTour() {
      const Shepherd = (await import('shepherd.js')).default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ShepherdAny = Shepherd as any

      if (cancelled) return

      const tour = new ShepherdAny.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          scrollTo:         { behavior: 'smooth', block: 'center' },
          cancelIcon:       { enabled: true },
          classes:          'levl1-tour-step',
          modalOverlayOpeningPadding: 8,
          modalOverlayOpeningRadius: 10,
          popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 14] } }],
          },
        },
      })

      tourRef.current = tour

      TOUR_STEPS.forEach((step, idx) => {
        const isLast  = idx === TOUR_STEPS.length - 1
        const isFirst = idx === 0

        tour.addStep({
          id:      step.id,
          title:   step.title,
          text:    step.text,
          attachTo: step.attachTo,
          buttons: [
            // Skip button (except last step)
            ...(!isLast
              ? [{
                  text:    'Skip tour',
                  action:  () => tour.cancel(),
                  classes: 'shepherd-skip-btn',
                }]
              : []),
            // Back button (not on first step)
            ...(isFirst
              ? []
              : [{
                  text:    '← Back',
                  action:  () => tour.back(),
                  classes: 'shepherd-back-btn',
                }]),
            // Next / Finish button
            {
              text:   isLast ? 'Create My First Position ✓' : 'Next →',
              action: isLast
                ? () => { tour.complete(); onOpenNewPosition() }
                : () => tour.next(),
              classes: 'shepherd-next-btn',
            },
          ],
          // Show "Step X of 8" in a header slot
          when: {
            show() {
              const el = document.querySelector('.shepherd-header')
              if (el && !el.querySelector('.shepherd-progress')) {
                const prog = document.createElement('span')
                prog.className = 'shepherd-progress'
                prog.textContent = `Step ${idx + 1} of ${TOUR_STEPS.length}`
                el.appendChild(prog)
              }
            },
          },
        })
      })

      tour.on('complete', () => localStorage.setItem(TOUR_KEY, 'true'))
      tour.on('cancel',   () => localStorage.setItem(TOUR_KEY, 'true'))

      // Small delay so the DOM is ready
      setTimeout(() => { if (!cancelled) tour.start() }, 800)
    }

    startTour().catch(console.error)

    return () => {
      cancelled = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(tourRef.current as any)?.cancel?.()
    }
  }, [onOpenNewPosition])

  return (
    <style>{`
      /* ── Shepherd.js custom styles matching Levl1 design system ── */
      .shepherd-modal-overlay-container path {
        fill: rgba(15, 15, 26, 0.55) !important;
      }

      .levl1-tour-step.shepherd-element {
        border-radius: 12px !important;
        box-shadow: 0 8px 40px rgba(79, 70, 229, 0.18), 0 2px 8px rgba(0,0,0,0.12) !important;
        border: 1.5px solid rgba(124, 58, 237, 0.22) !important;
        max-width: 340px !important;
        font-family: var(--font-sans, system-ui, sans-serif) !important;
      }

      .levl1-tour-step .shepherd-header {
        background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%) !important;
        border-radius: 10px 10px 0 0 !important;
        padding: 14px 18px 12px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
      }

      .levl1-tour-step .shepherd-title {
        color: #fff !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        letter-spacing: -0.01em !important;
        line-height: 1.3 !important;
        flex: 1 !important;
      }

      .levl1-tour-step .shepherd-progress {
        font-size: 11px !important;
        font-weight: 600 !important;
        color: rgba(255,255,255,0.55) !important;
        white-space: nowrap !important;
      }

      .levl1-tour-step .shepherd-cancel-icon {
        color: rgba(255,255,255,0.60) !important;
        font-size: 18px !important;
        line-height: 1 !important;
        padding: 2px !important;
        display: flex !important;
        background: none !important;
        border: none !important;
        cursor: pointer !important;
      }
      .levl1-tour-step .shepherd-cancel-icon:hover {
        color: #fff !important;
      }

      .levl1-tour-step .shepherd-text {
        padding: 16px 18px 4px !important;
        font-size: 13px !important;
        color: #475569 !important;
        line-height: 1.65 !important;
      }

      .levl1-tour-step .shepherd-footer {
        padding: 12px 18px 16px !important;
        display: flex !important;
        gap: 8px !important;
        align-items: center !important;
      }

      .shepherd-skip-btn {
        background: none !important;
        border: none !important;
        color: #94A3B8 !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        padding: 0 !important;
        margin-right: auto !important;
        text-decoration: underline !important;
        font-family: inherit !important;
      }
      .shepherd-skip-btn:hover { color: #64748B !important; }

      .shepherd-back-btn {
        background: #F1F5F9 !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 7px !important;
        color: #475569 !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        padding: 7px 14px !important;
        cursor: pointer !important;
        font-family: inherit !important;
        transition: background 0.15s !important;
      }
      .shepherd-back-btn:hover { background: #E2E8F0 !important; }

      .shepherd-next-btn {
        background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%) !important;
        border: none !important;
        border-radius: 7px !important;
        color: #fff !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        padding: 7px 16px !important;
        cursor: pointer !important;
        font-family: inherit !important;
        box-shadow: 0 2px 8px rgba(124,58,237,0.25) !important;
        transition: box-shadow 0.15s !important;
      }
      .shepherd-next-btn:hover { box-shadow: 0 4px 14px rgba(124,58,237,0.38) !important; }

      .shepherd-arrow::before {
        background: #fff !important;
        border: 1.5px solid rgba(124,58,237,0.18) !important;
      }
    `}</style>
  )
}

/** Restart tour — clears localStorage flag */
export function restartTour() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOUR_KEY)
    window.location.reload()
  }
}
