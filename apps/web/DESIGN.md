# DESIGN.md — Levl1 marketing site

Scope: the public site in `app/(marketing)` (levl1.io). Since 2026-11-23 the
Screen product app shares this palette and type at the TOKEN level
(`app/screen-tokens.css`: paper/sunken/line/ink, Instrument Sans display
headings, JetBrains Mono evidence; headings on Screen surfaces via
`html[data-lv-type]` in `app/screen-ui.css`). The app keeps its own component
rules and compact sizes (Screen minimalist design); Hire is not affected.

**Direction: "evidence on paper."** A warm, editorial, light-first site where
the product's *evidence* — transcript lines, test results, timestamps, a
recommendation — is the visual hero. Confident type, one indigo accent, real
product moments on soft tinted panels. Calm and technical, not glossy.

Built from six reference sites viewed on 2026-11-17 (ramp.com, monday.com,
calendly.com, zapier.com, lattice.com, kajabi.com). We take their *patterns*,
not their look: no colours, fonts, copy or illustrations are copied.

| Pattern seen | Where | How Levl1 uses it |
|---|---|---|
| Display face at weight 400–500, never bold | all six (Lausanne, Poppins, Calendly Sans, Degular, Matter, Haffer) | Instrument Sans 500 for headings; Inter only for body |
| Warm off-white page instead of cold grey | Calendly `#FCFBF8`, Zapier `#FFFEFB` | `paper` background, white cards on top |
| One loud accent + a soft tint of it | Lattice (green + mint), monday (indigo + lavender chips) | Indigo for primary; indigo tint for secondary and selected |
| Product on a big rounded tinted panel, not a fake window | Calendly, Lattice, Ramp (dotted canvas) | `panel` component with a faint dot grid; no traffic-light chrome |
| Interactive hero, not just two buttons | Ramp (picker), monday (use-case chips), Zapier (toggle) | Role chips that start a live demo interview |
| A concrete story with tiny real events | Calendly ("Client picks Tuesday at 2 p.m.") | "One interview, minute by minute" evidence timeline |
| Two- or three-beat lines | Ramp, Zapier, Lattice, Kajabi | Headlines and module taglines rewritten this way |
| Tabs instead of rows of identical cards | monday (by team), Kajabi (by product) | Audience tabs; "inside the interview" tabs |
| Small reassurance microcopy under CTAs | monday, Calendly | "No sign-up · about 6 minutes · microphone needed" |

Not used, by rule: live counters, customer logos, testimonials and stats
(Ramp, Lattice) — Levl1 shows no proof it can't verify. Gradient text, glass
blur, glows and purple-to-blue gradients are out.

---

## Color

Tokens are RGB triplets on `.mk-root` in `app/(marketing)/marketing.css`,
exposed to Tailwind as `mk.*` (names below are aliases; code variables in
brackets: paper `--mk-bg`, sunken `--mk-mist`, body `--mk-slate`, accent-ink
`--mk-accent-text`, accent-tint `--mk-accent-soft`). Light is the default;
dark mirrors it.

| Token | Light | Dark | Role |
|---|---|---|---|
| `paper` | `#FBFAF7` | `#0C0C0E` | page background |
| `surface` | `#FFFFFF` | `#17171A` | cards, panels' inner UI, nav on scroll |
| `sunken` | `#F4F2EE` | `#121214` | alternating bands, chips at rest |
| `ink` | `#111114` | `#F4F4F5` | headings, primary text |
| `body` | `#3F3F46` | `#D4D4D8` | paragraphs |
| `muted` | `#6B6B73` | `#A1A1AA` | captions, labels, meta (≥ 4.5:1 on paper and surface) |
| `line` | `#E7E4DE` | `#2A2A2E` | hairlines, card borders |
| `accent` | `#4F46E5` | `#6366F1` | primary buttons, links, focus, the "live" dot |
| `accent-ink` | `#4338CA` | `#A5B4FC` | accent-coloured text (links, active tab) |
| `accent-tint` | `#EEF0FF` | `#1E1B4B` | secondary buttons, selected chips, panel backgrounds |
| `evidence-pass` | `#047857` | `#34D399` | test passed, "advance" — inside mockups only |
| `evidence-flag` | `#B45309` | `#FBBF24` | integrity flag — inside mockups only |
| `danger` | `#B91C1C` | `#F87171` | form errors |

Rules: indigo is the only brand colour. Green/amber appear only *inside*
product evidence, never as decoration. The primary button stays `#4F46E5`
with white text in both themes (contrast).

## Typography

- **Display — Instrument Sans**, weight 500 (600 for the hero only if needed).
  Headings, big numbers in the timeline. Self-hosted via `@fontsource`.
- **Body — Inter**, 400 / 500. Everything else.
- **Evidence — JetBrains Mono**, 400. Timestamps, test results, transcript
  speaker tags, stage numbers. This is the site's signature: real-looking data.

| Step | Size / line-height | Use |
|---|---|---|
| `display` | 76 / 1.0 (clamp 44→76) | Home hero only |
| `h1` | 60 / 1.04 (clamp 40→60) | page heroes |
| `h2` | 44 / 1.08 (clamp 32→44) | section titles |
| `h3` | 24 / 1.25 | feature and tab titles |
| `lead` | 20 / 1.55 | hero and section intros |
| `body` | 17 / 1.6 | paragraphs (never below 16) |
| `small` | 14 / 1.5 | captions, microcopy |
| `mono` | 13 / 1.5 | evidence, labels |

Letter-spacing: display/h1 −0.03em, h2 −0.025em, others 0. Paragraph width
60–70ch. Headlines are never two-tone grey; emphasis comes from wording.

## Spacing and layout

- 4-based scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Sections: 128 desktop / 80 mobile. Content width 1200, text columns ≤ 680.
- Mix alignments: left-aligned section heads with a right-side aside by
  default; centre only the final CTA.
- Mobile gutter 20.

## Shape and depth

- Radius: `sm` 8 (buttons, inputs, chips use full pill 999), `md` 12 (cards),
  `lg` 20 (panels), `xl` 28 (hero panel).
- Shadow: none on cards. One soft shadow for UI floating on a panel:
  `0 1px 2px rgb(17 17 20 / .06), 0 12px 32px -12px rgb(17 17 20 / .18)`.
  Popovers reuse it.

## Components

- **Buttons** — *primary*: accent fill, white text, pill, 48px tall (40 in
  nav). *secondary*: accent-tint fill, accent-ink text. *quiet*: text link
  with arrow. Hover darkens 6%; focus = 2px accent ring offset 2; disabled 50%
  opacity. Microcopy line under the primary pair.
- **Role chips** — pill, sunken at rest, accent-tint + accent-ink when
  selected; each starts the demo for that role.
- **Panel** — `accent-tint` (or `sunken`) rounded `lg/xl` with a 1px dot grid
  at 6% ink; real product UI floats on it with the one shadow. Replaces the
  fake browser window.
- **Evidence snippet** — mono timestamp + one line of product truth
  (`06:40  tests 4/4 passed`, `12:02  flag · second face, 6s`). Used in the
  hero, timeline and pillars.
- **Timeline** — vertical (mobile) / horizontal (desktop) list of evidence
  snippets with display-size timestamps.
- **Tabs** — underline style, accent-ink active, keyboard arrows; content =
  copy + one panel.
- **Cards** — surface, 1px line, `md` radius, no shadow; never three
  identical cards in a row without a visual difference (icon, mono label or
  panel).
- **Nav** — paper background, hairline on scroll (no blur), pill CTAs.
- **Footer** — sunken band, 5 link columns, early-access note, "© 2026 Levl1" line.
- **Inputs** — surface, 1px line, `sm` radius, accent focus ring.

## Imagery and icons

- **Product only.** Real screen captures or faithful recreations of real
  screens, cropped to the moment that matters (a flag, a test result, a
  recommendation), on panels. Prefer a short silent screen recording of a
  real interview for the hero once available. No stock photos of people, no
  3D blobs, no AI art, no fake window chrome.
- **Icons**: lucide, 1.75 stroke, `ink` or `muted`, 20px; never inside
  coloured gradient tiles; no emoji.
- **Motion**: transform/opacity only; one reveal per section; the timeline
  can step in; respect `prefers-reduced-motion`.
