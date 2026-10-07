// Window chrome for recreated product UI. The whole mock is exposed to
// assistive tech as one image with a plain-language label.
export function Frame({ title, label, children, dark = false, className = '' }: {
  title: string; label: string; children: React.ReactNode; dark?: boolean; className?: string
}) {
  return (
    <div role="img" aria-label={label}
      className={`overflow-hidden rounded-[1.25rem] border ${dark ? 'border-white/10 bg-[#0E1230]' : 'border-mk-line bg-white'} shadow-[0_40px_80px_-40px_rgba(30,27,75,0.45),0_0_0_1px_rgba(255,255,255,0.6)_inset] ${className}`}>
      <div aria-hidden className={`flex items-center gap-1.5 border-b px-4 py-2.5 ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-[#EEF0FA] bg-[#FBFBFE]'}`}>
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className={`ml-3 truncate text-[11px] font-semibold ${dark ? 'text-slate-500' : 'text-slate-500'}`}>{title}</span>
      </div>
      <div aria-hidden>{children}</div>
    </div>
  )
}

export function scoreTone(s: number) { return s >= 80 ? 'text-emerald-700 bg-emerald-50' : s >= 60 ? 'text-amber-700 bg-amber-50' : 'text-rose-600 bg-rose-50' }
