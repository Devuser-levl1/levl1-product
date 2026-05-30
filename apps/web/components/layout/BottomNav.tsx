'use client'

import { LayoutDashboard, Users, Briefcase, BarChart2, Settings } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

const TABS = [
  { key: 'dashboard',  label: 'Home',       Icon: LayoutDashboard },
  { key: 'candidates', label: 'Candidates',  Icon: Users },
  { key: 'positions',  label: 'Positions',   Icon: Briefcase },
  { key: 'analytics',  label: 'Analytics',   Icon: BarChart2 },
  { key: 'settings',   label: 'Settings',    Icon: Settings },
] as const

export function BottomNav() {
  const { activeSection, setActiveSection } = useAppStore()

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {TABS.map(({ key, label, Icon }) => {
        const active = activeSection === key
        return (
          <button
            key={key}
            onClick={() => setActiveSection(key as typeof activeSection)}
            style={{
              flex:           1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            3,
              border:         'none',
              background:     'none',
              cursor:         'pointer',
              padding:        '8px 4px',
              color:          active ? '#4F46E5' : '#94A3B8',
              transition:     'color 0.15s',
              fontFamily:     'var(--font-sans)',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            <span style={{
              fontSize:   10,
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.01em',
              lineHeight: 1,
            }}>
              {label}
            </span>
            {active && (
              <span style={{
                position:     'absolute',
                top:          0,
                width:        '100%',
                height:       2,
                background:   '#4F46E5',
                borderRadius: '0 0 2px 2px',
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
