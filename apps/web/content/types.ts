import type { IconName } from '@/config/site'

// Shared shapes for marketing copy. Pages render these through the section
// components in components/marketing/sections — copy edits never touch layout.
export interface CTA { label: string; href: string }
export interface Item { icon?: IconName; title: string; body: string }
export interface Step { title: string; body: string }
export interface FAQItem { q: string; a: string }
export interface Heading { eyebrow?: string; title: string; highlight?: string; lead?: string }
export interface SplitBlock extends Heading { bullets?: string[]; link?: CTA; visual: VisualKey }

/** Product UI mockups available to content files (see components/marketing/mocks/registry). */
export type VisualKey =
  | 'screenRoom' | 'screenReport' | 'screenIntegrity' | 'screenConsent' | 'screenApproval'
  | 'hpBrief' | 'hpProfile' | 'hpPipeline' | 'hpLev' | 'hpInbox' | 'hpSubmit' | 'hpAR' | 'hpNurture'
  | 'hpTeam' | 'hpCareers' | 'hpSourcing' | 'hpMatch'
