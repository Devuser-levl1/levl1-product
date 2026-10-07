import { LegalPage, H, P } from '@/components/marketing/legal'
import { pageMetadata } from '@/lib/marketing/metadata'
import { CONTACT_EMAIL, LEGAL_ENTITY } from '@/config/site'

export const metadata = pageMetadata({ title: 'Terms of Service — Levl1', description: `The terms between you and ${LEGAL_ENTITY} for using Levl1.`, path: '/terms', og: 'legal' })

export default function Terms() {
  return <LegalPage title="Terms of Service" updated="October 2026">
    <P>These terms are an agreement between you and {LEGAL_ENTITY} (&ldquo;we&rdquo;, &ldquo;us&rdquo;), which provides Levl1, including Levl1 Screen and HirePilot. By creating an account or using the service you agree to them.</P>
    <H>Accounts</H><P>You are responsible for your account, your team’s access, and the accuracy of the data you upload, including having a lawful basis to process candidate data.</P>
    <H>Acceptable use</H><P>Do not misuse the service, attempt to breach tenant isolation, reverse-engineer the platform, or use it to discriminate unlawfully. AI outputs assist human decisions; final hiring decisions remain yours.</P>
    <H>Subscriptions &amp; billing</H><P>Paid plans are invoiced as set out in your order form. Trials convert to paid only if you choose a plan. Fees are non-refundable except where required by law.</P>
    <H>Intellectual property</H><P>{LEGAL_ENTITY} retains all rights to the platform. You retain rights to your data; you grant us a licence to process it to provide the service.</P>
    <H>Disclaimers &amp; liability</H><P>The service is provided &ldquo;as is.&rdquo; To the maximum extent permitted by law, {LEGAL_ENTITY} is not liable for indirect or consequential damages; aggregate liability is limited to fees paid in the prior 12 months.</P>
    <H>Termination</H><P>Either party may terminate per the plan terms. On termination we delete or return your data on request, subject to legal retention.</P>
    <H>Governing law &amp; changes</H><P>Governing law is specified in your order form or, absent that, the laws applicable to {LEGAL_ENTITY}’s principal place of business. We may update these terms with notice.</P>
    <H>Contact</H><P>{LEGAL_ENTITY}, {CONTACT_EMAIL}.</P>
  </LegalPage>
}
