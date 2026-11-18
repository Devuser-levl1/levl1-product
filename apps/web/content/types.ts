import type { IconName } from '@/config/site'

// Shared shapes for marketing copy. Pages render these through the section
// components in components/marketing/sections — copy edits never touch layout.
export interface CTA { label: string; href: string }
export interface Item { icon?: IconName; title: string; body: string }
export interface Step { title: string; body: string }
export interface FAQItem { q: string; a: string }
export interface Heading { eyebrow?: string; title: string; highlight?: string; lead?: string }
export interface SplitBlock extends Heading { bullets?: string[]; link?: CTA; visual: VisualKey }

/** A homepage pillar: the promise, then the proof that backs it, then real UI. */
export interface Pillar { eyebrow: string; title: string; promise: string; proof: string[]; note?: string; link?: CTA; visual: VisualKey }

/** One audience in an "built for both" split. */
export interface Audience { label: string; title: string; points: string[] }

/** One "Today → With Screen" row. */
export interface ComparisonRow { today: string; withScreen: string }

/** One moment in the illustrative interview timeline. */
export interface TimelineStep { time: string; title: string; body: string; evidence: string; tone?: 'pass' | 'flag' | 'neutral' }

/** One tab: copy on one side, a product visual on the other.
 *  `shortLabel` / `bodyShort` are shown below the `sm` breakpoint only. */
export interface TabItem { id: string; label: string; shortLabel?: string; title: string; body: string; bodyShort?: string; bullets?: string[]; visual: VisualKey }

/** Product UI mockups available to content files (see components/marketing/mocks/registry). */
export type VisualKey =
  | 'screenRoom' | 'screenReport' | 'screenIntegrity' | 'screenConsent' | 'screenApproval' | 'screenControl'
  | 'snipVoice' | 'snipCode' | 'snipWhiteboard' | 'snipFollowup' | 'snipLogistics' | 'snipCulture'
  | 'hpBrief' | 'hpProfile' | 'hpPipeline' | 'hpLev' | 'hpInbox' | 'hpSubmit' | 'hpAR' | 'hpNurture'
  | 'hpTeam' | 'hpCareers' | 'hpSourcing' | 'hpMatch'
