# IEP1 Design System

## Context
IEP1 — Inspection de l'Enseignement Primaire, circonscription 1 — is a public school-inspection body within the **Gouvernement de la Nouvelle-Calédonie** education administration (Dumbéa area). It supports school teams (directors, teachers) across primary schools. Its motto, carried on the logo: *"Avec les équipes, pour les élèves"* (With the teams, for the students).

This is not a software product. The only source material is an institutional identity (logo) and a PowerPoint template used for **réunions and formations** (staff meetings/training sessions) with school teams — title slide, agenda, values, content, and closing slides. This design system therefore focuses on **presentation/communication assets**: brand foundations, a small set of print/slide-oriented components, and slide templates matching the provided deck structure.

### Sources
- Official IEP1 logo (circular badge) — `assets/logo/iep1-logo.png`.
- A 6-slide meeting/training PowerPoint template (Google Slides-authored .pptx), created by Mathilde AUDEBERT (2019), still in active placeholder use (dates like "jj mm 2026"). Slides: title, "Déroulement de la réunion/formation" (agenda), values (Collaboration–Échanges / Réussite-Ambition / Équité-Bienveillance / Monitoring-Supervision-Accompagnement), free content ×2, closing ("À très bientôt dans vos écoles").
- The template also carries the **Gouvernement de la Nouvelle-Calédonie** emblem (shell/pirogue mark) — copied into `assets/logo/` as reference/context only; it is the parent institution's own mark, not IEP1's, and should not be redrawn or altered.
- No Figma file, codebase, or app/website was provided — nothing beyond the two files above was used.

## Content fundamentals
- **Language**: French (New Caledonia, France). All copy in the source is French; the audience is school staff (vouvoiement, professional register).
- **Tone**: institutional but warm — collaborative rather than directive. The motto pairs an action ("avec les équipes") with a beneficiary ("pour les élèves"): every message should name who it serves.
- **Structure over decoration**: slide titles are short noun phrases ("Déroulement de la réunion/formation", "Collaboration – Échanges"), often paired value-words joined by an en dash: *"Réussite - Ambition"*, *"Équité – Bienveillance"*, *"Monitoring – Supervision - Accompagnement"*.
- **Sign-off warmth**: closing slide reads *"À très bientôt dans vos écoles"* / *"à vos côtés"* / *"Nous sommes à votre disposition, à votre écoute"* — reassuring, service-oriented, never salesy.
- **No emoji, no exclamation-heavy copy.** Punctuation is calm; emphasis comes from bold type and color, not typography tricks.
- **Placeholders** use literal "xxxxxxxxxxx" or "jj mm 2026" / "Ecole XXX" strings — keep that convention for template copy meant to be filled in later.

## Visual foundations
- **Color**: navy (`--navy-900 #0F2942`, `--navy-800 #123C62`) for headings and the logo ring/wordmark; a deep institutional blue (`--blue-deep #005E86`) for slide title accents; a lighter sky-blue (`--blue-mid #509ED5`/`--blue-mid-2 #5AA1D8`) for body accents and one bright teal (`--teal #39B2C5`) from the logo's decorative arcs. Three secondary accents echo the logo exactly: orange (`--orange-400 #F47A4B` / `--orange-700 #DC472F`), green (`--green-400 #52BB94` / `--green-700 #24952E`), and an olive tone from the logo's figure (`--olive #7C9947`). Max 1–2 accent colors per composition — don't rainbow everything at once.
- **Type**: display/headings in a condensed bold sans (source used **Arial Narrow Bold**; substituted with **Roboto Condensed Bold**, see Font note below) — all-caps or sentence case, tight leading. Body copy in **Roboto** (also embedded in the source file). No serif anywhere.
- **Spacing**: generous, calm — slides use wide margins and centered title blocks (title slide title block sits ~1/8 in from each edge). 4/8-px-based scale (`--space-1..9`) for anything web/print.
- **Backgrounds**: plain white or `--surface-navy` full-bleed fields — no photography, no gradients, no textures/patterns in the source. Full-bleed color blocks (navy) are used for section/closing slides.
- **Decorative marks**: small L-shaped corner "accent bars" (single flat color, no gradient) mark section slides — see `assets/decorative/`. These are the only recurring decorative motif; they are not full illustrations, just colored corner brackets.
- **Animation**: none observed in source (static slides). Keep motion minimal and functional if added (simple fades), never bouncy.
- **Hover/press states**: not defined by source (static print/slide medium). Components in this system use conservative conventions: hover = darken 8–10%, press = darken further + scale 0.98.
- **Borders & shadows**: source uses no borders/shadows (flat design). Components here use a soft `--shadow-card` only where elevation communicates hierarchy (e.g. a callout card on a white page); flat by default.
- **Radius**: source shapes are all sharp rectangles (0 radius) except the circular logo badge. Use `--radius-sm/md` sparingly for UI-only components (buttons, tags); keep slide/print layouts square-cornered to match source fidelity.
- **Transparency/blur**: none in source; avoid unless functionally necessary.
- **Imagery color vibe**: none in source beyond flat vector marks — no photography to characterize.
- **Cards**: flat white surface, 1px `--border-subtle` or a soft shadow, `--radius-md`, no colored left-border accent (avoided per brand — the source never uses that pattern).

## Iconography
- No icon system, icon font, or SVG icon set exists in the source. The only pictorial elements are the illustrative figures baked into the IEP1 logo itself (people, school, book, palm tree, staircase, arrow) — these are part of the fixed logo mark, not a reusable icon language, and must not be extracted/reused as standalone icons.
- No emoji or unicode-glyph icons are used anywhere in the source.
- Where a UI component in this system needs a glyph (e.g. a chevron on Button), it substitutes minimal inline-SVG strokes at the logo's navy/blue weight — flagged as an intentional addition below, not a source-derived system.

## Font substitution — ACTION NEEDED
The source embeds **Arial Narrow** (bold/regular/italic/bold-italic) and **Roboto** (regular/bold/italic/bold-italic) as PowerPoint-obfuscated `.fntdata` binaries, which cannot be safely de-obfuscated/reused as web fonts. Roboto is used as-is (available on Google Fonts). Arial Narrow is a licensed system font not on Google Fonts — this system substitutes **Roboto Condensed** (closest open condensed sans, similar weight/width). **If you have the original Arial Narrow license/files, share them and we'll swap in the exact family.**

## Intentional additions
Because no codebase/Figma defines a component inventory, this system authors a small standard set sized to the brand's actual need (print/slide/communications, not an app): **Button, Tag, Callout/InfoBox, SectionDivider, StatBlock**. These are original additions in the shared visual language, not recreations of an existing UI.

## Index
- `styles.css` — root stylesheet (imports `tokens/*.css`). Link this one file to pick up every color/type/spacing token below.
- `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css` — CSS custom properties (the actual color codes, fonts, spacing scale).
- `assets/logo/` — IEP1 logo, Gouvernement NC emblem (context only).
- `assets/decorative/` — accent-bar images, "École de la confiance" graphic (context only).
- `guidelines/` — foundation specimen cards (open any `.html` file directly in a browser to see the colors/type/spacing rendered).
- `components/core/` — Button, Tag, Callout, SectionDivider, StatBlock (`.jsx` + `.d.ts` + `.prompt.md` each) — plain React components, import-and-use, no extra dependencies beyond React.
- `slides/` — TitleSlide, AgendaSlide, ValuesSlide, ContentSlide, ClosingSlide reference snippets, matching the source deck's slides.
- `templates/reunion-formation-deck.html` — a ready-to-use, standalone (single-file, offline-capable) 5-slide Réunion/Formation deck. Duplicate this file for each new meeting/training and edit the text directly; keyboard/click navigation and print support are already built in.
