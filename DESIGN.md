# Prompt Info Design System

## Intent

Prompt Info should feel like a precise operating instrument with an editorial point of view. It keeps the existing near-black canvas, red signal color, condensed display type, monospace receipts, hard rules, and fine grid. The renovation changes hierarchy, density, and explanatory power without turning the product into a generic analytics dashboard.

<design_plan>
Python RNG execution for the 67-character approval prompt:
`seed=67 -> hero=Cinematic Center, font=Satoshi`
`components=Feedback/Testimonial Carousel, Horizontal Accordions, Infinite Marquee`
`motion=Scrubbing Text Reveals, Card Stacking`

Applicability boundary: GPT Taste explicitly excludes routine product UI. The randomized result is therefore used as a composition stress test, not as permission to add a marketing carousel, autoplay marquee, Satoshi dependency, or GSAP dependency. The product design system takes priority. The centered opening becomes a compact two-line thesis above the workbench; horizontal accordions become user-controlled evidence disclosures; the comparison strip is static and scannable instead of infinitely moving; receipt and chart blocks use layered stacking without scroll hijacking. Existing Outfit, Nebula Sans, and Space Mono remain authoritative.

AIDA check: Navigation provides route and theme controls. Attention is a compact two-line product thesis. Interest is the live comparison workbench. Desire is the evidence-rich chart and receipt area. Action is copy/export plus direct links into the two scenario labs and the clean footer.

Hero math: the heading uses a full-width container capped at 80rem, with a text measure no narrower than 18 characters on mobile and a desktop `max-width` equivalent to `max-w-6xl`. Copy is limited to two lines at 1024 px and above, three lines at 375 px. There are no stamps, badge clusters, or raw vanity metrics in the hero.

Grid density: the desktop workbench is a 12-column grid with a 7-column scenario pane and a 5-column live receipt. `7 + 5 = 12`, so every row is filled. Comparison charts occupy 4 + 4 + 4 columns. `4 + 4 + 4 = 12`, so no corner is empty. At narrower widths, each cell spans all 12 columns. `grid-auto-flow: dense` is applied wherever multi-row cards are used.

Label and button check: labels describe actions or values, never sequence numbers. Button text uses white on the red primary fill or the high-contrast foreground on dark surfaces. Every icon-only control has an accessible name. Focus treatment is visible on every interactive element.
</design_plan>

## Visual grammar

### Color

The existing semantic variables remain the foundation:

| Role | Token | Default |
| --- | --- | --- |
| Page | `--color-rose-base` | `#0a0a0a` |
| Surface | `--color-rose-surface` | `#101010` |
| Raised surface | `--color-rose-overlay` | `#181818` |
| Primary text | `--color-rose-text` | `#eaeaea` |
| Secondary text | `--color-rose-subtle` | `#b7b7b7` |
| Muted text | `--color-rose-muted` | `#777777` |
| Signal and action | `--color-rose-love` | `#e61919` |
| Divider | `--color-rose-highlightMed` | `#2a2a2a` |

Red means active, selected, or economically significant. It is not used for every decoration and is not the only error indicator. Success, stale, fallback, and warning states use text labels, symbols, and restrained semantic colors that pass contrast requirements.

Existing alternate themes can remain available, but dark is the default and all new components consume semantic variables instead of fixed theme-specific colors.

### Typography

- Display: existing Outfit or bundled Nebula Sans, ultra-bold, condensed through tracking and line-height rather than an added font dependency.
- Body: Outfit with a comfortable 1.5 to 1.65 line height.
- Data: Space Mono for rates, tokens, totals, timestamps, and receipts.
- Numeric output: tabular numerals.

The primary heading is editorial but compact. Interface copy uses sentence case. Uppercase is reserved for short control labels, column headers, and receipt metadata.

### Shape and depth

- Corners remain square or minimally rounded.
- One-pixel borders and offset red shadows create depth.
- Cards exist only for bounded interactive or evidentiary units.
- Decorative grids stay subtle and never compete with form controls.
- The receipt keeps its perforated-paper cues because it is a recognizable product motif.

## Page composition

### Navigation

The navigation remains compact and sticky. It includes the product mark, Workbench, Format Lab, Token Efficiency, About, and theme control. On mobile, it collapses into a keyboard-accessible menu with a visible close action and preserved current-page state.

### Opening and workbench

The opening copy and primary inputs share the first viewport. The headline states the job, not a slogan. The scenario pane supports prompt text, direct token entry, output plan, session turns, and recurrence through progressive disclosure.

The receipt pane updates without layout jumps. Its top line answers the immediate question with request, monthly, and annual cost. Model details, cache math, and provenance follow in decreasing order of importance.

### Model comparison

The selected-model rail supports two or three models. Each row has a native searchable selector or accessible combobox, exact rates, result totals, and remove action. The recommended row is identified with both text and a border treatment. Missing rates disable only the affected calculation and explain why.

### Charts

Charts are dependency-free semantic SVG or CSS layouts with adjacent data tables.

- Cost by model uses sorted horizontal bars, exact values, and consistent scale.
- Token composition uses a stacked horizontal bar with patterned or labeled segments and a legend.
- Session accumulation uses a step or line path with labeled turns and an accessible table of cumulative values.

Charts do not rely on hover. Focus and pointer interactions reveal the same detail. Values remain visible when printing or exporting.

### Evidence and methodology

Source, freshness, and fallback state sit beside the result they qualify. Long methodology uses native `details` disclosures, openable by keyboard. Static fallback is labeled before any recommendation text.

### Labs and footer

The labs appear as compact continuation actions using the current scenario. The footer contains product relationships, methodology, privacy, source links, and Hello.World attribution without a giant sales CTA.

## Interaction and motion

Motion must help users track recalculation, selection, or disclosure.

- Totals crossfade or count over 120 to 180 ms when a scenario changes.
- Chart bars and paths reveal once on first render, then update directly.
- Model rows use restrained transform and border transitions on selection.
- The receipt may stack visual layers through static offsets, but it never pins or hijacks scrolling.
- All animation stops under `prefers-reduced-motion: reduce`.

No autoplay marquee, video, carousel, scroll pinning, or GSAP dependency is introduced. Product response time and legibility take priority over cinematic motion.

## Responsive behavior

- At 1440 px and 1024 px, scenario and receipt share a 7:5 grid.
- Below 900 px, receipt follows the essential inputs and may use a sticky compact total bar.
- At 768 px, comparison rows stack their selector and totals without horizontal scrolling.
- At 375 px, controls are at least 44 px tall, numeric fields use appropriate `inputmode`, and charts switch to full-width bars with tables below.
- Long model names wrap or truncate with an accessible full label.

## Accessibility

- Meet WCAG AA contrast for text and controls.
- Preserve native labels and field descriptions.
- Announce calculation status and material result changes through a polite live region without reading every keystroke.
- Use `fieldset` and `legend` for related scenario controls.
- Keep focus order aligned with visual order.
- Never encode recommendation, stale state, or error state by color alone.
- Provide exact-value tables for every chart.
- Avoid motion that can trigger vestibular discomfort.

## Content rules

- State criteria: "Lowest monthly cost among selected models," not "Best model."
- State uncertainty: "Static fallback from 2026-08-30," not "Live pricing."
- Use plain units: per request, per session, per month, per year.
- Keep source names and retrieved timestamps visible.
- Do not use fake social proof, testimonials, logos, vanity counts, or numbered meta-labels.
- Do not use em dashes or emojis.

## Performance budget

- No new production dependency for charts or motion.
- No client request to third-party pricing or benchmark APIs.
- Lazy-load export-only code when export is invoked.
- Build search indexes with lazy state initialization or memoization.
- Avoid storing duplicate model catalogs in component state.
- Keep first-view layout stable while catalogs load.

## Visual acceptance

Rendered verification must cover 375 x 812, 768 x 1024, 1024 x 768, and 1440 x 900. At each size:

- the main job is obvious,
- the calculator is not buried,
- there is no horizontal overflow,
- all controls have visible focus and usable targets,
- loading, error, partial-data, and fallback messages fit their containers,
- exact chart values remain readable,
- the interface still looks recognizably like Prompt Info.
