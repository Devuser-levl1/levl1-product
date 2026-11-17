// Product UI chrome: a slim app header (title only — no fake browser window
// dots). Always rendered with light tokens (.mk-light): mockups are
// "screenshots" of the light product in either site theme. The whole mock is
// one image for assistive tech. Signature kept for existing callers.
export function Frame({ title, label, children, dark = false, className = '' }: {
  title: string; label: string; children: React.ReactNode; dark?: boolean; className?: string
}) {
  return (
    <div role="img" aria-label={label}
      className={`mk-light overflow-hidden rounded-xl border ${dark ? 'border-zinc-800 bg-zinc-950' : 'border-[#E7E4DE] bg-white'} ${className}`}>
      <div aria-hidden className={`flex items-center gap-2 border-b px-4 py-2.5 ${dark ? 'border-zinc-800' : 'border-[#E7E4DE] bg-[#FBFAF7]'}`}>
        <span className="font-mono text-[10.5px] font-medium tracking-wide text-zinc-600">{title}</span>
      </div>
      <div aria-hidden>{children}</div>
    </div>
  )
}

export function scoreTone(s: number) { return s >= 80 ? 'text-emerald-700 bg-emerald-50' : s >= 60 ? 'text-amber-800 bg-amber-50' : 'text-rose-700 bg-rose-50' }
