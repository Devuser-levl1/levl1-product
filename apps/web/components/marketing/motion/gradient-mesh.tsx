// CSS-only purple/blue light field. Decorative; hidden from assistive tech.
// Only hero meshes animate (`animate`); bands use static light to keep the main thread free.
export function GradientMesh({ dark = false, animate = false, className = '' }: { dark?: boolean; animate?: boolean; className?: string }) {
  return (
    <div aria-hidden className={`mk-mesh ${dark ? 'mk-mesh-dark' : ''} ${animate ? '' : 'mk-mesh-static'} ${className}`}>
      <span /><span /><span />
    </div>
  )
}
