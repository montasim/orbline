# Orbline UI scale

One scale for every screen. If a value isn't listed here, it isn't used; add it here first if a
genuinely new role appears. Values are Tailwind v4 utilities (1 unit = 4px).

## Spacing (4px grid — no half steps)

| Token | px | Role |
|---|---|---|
| `1` | 4 | between stacked text lines (label over value, title over subtitle) |
| `2` | 8 | icon ↔ text; items in a list, grid or button group; chip rows |
| `3` | 12 | padding inside rows/list items (vertical); between a card's header and body |
| `4` | 16 | padding inside cards and rows (horizontal); between sections of a dialog; screen edge on phones |
| `6` | 24 | padding inside dialogs/panels (sm+); screen edge on larger screens; between major screen regions |
| `8` | 32 | breathing room around the title block |

Rules
- Gaps between siblings use `gap-*` on the parent, never margins on children.
- Margins only for layout pushes (`mx-auto`, `my-auto`, `mt-auto`).
- Same role ⇒ same value on every screen (e.g. every dialog body is `gap-4`, every list is `gap-2`).

## Type

| Class | px | Role |
|---|---|---|
| `text-xs` | 12 | captions, stat labels, hints, badges, prices |
| `text-sm` | 14 | body text, secondary buttons, rows, chips |
| `text-base` | 16 | emphasised inline values, list titles |
| `text-lg` | 18 | primary buttons |
| `text-xl` | 20 | dialog titles |
| `text-2xl` | 24 | stat numbers, HUD numbers (sm+) |
| `text-4xl` / `sm:text-5xl` | 36 / 48 | screen titles (Paused, Run over) |
| `text-6xl` / `sm:text-7xl` / `md:text-8xl` | — | the title-screen wordmark only |

- Exo 2 (`font-display`) is `font-extrabold` (titles, labels, buttons) or `font-bold` (row titles); Nunito body emphasis is `font-bold`.
- No arbitrary sizes (`text-[11px]` etc.).
- Mixed fonts on one line share a baseline (`items-baseline`).

## Game-UI voice (classes in `styles.css`)

Every screen speaks the same arcade language; reuse these instead of restyling text per screen.

| Class | Role |
|---|---|
| `.kicker` | mint, uppercase, wide-tracked micro-label above a title ("Run complete", "Options") — `DialogShell kicker` |
| `.game-title` | uppercase Exo 2 title with a teal glow (dialog and screen titles) |
| `.glow-num` | scores, counters, stats: extra-bold tabular numbers with a soft glow in their own colour |
| `.frost-panel` | every panel, card and dock: smoky base with a neon mint edge |
| `.btn-aurora` | the one primary action per screen (via `<Button variant="aurora">`) |

- Buttons, badges, stat labels, HUD labels, dock labels and world names are uppercase Exo 2 with `tracking-wider`.
- Body copy, descriptions and hints stay sentence-case Nunito; the contrast is what reads as "game UI".

## Icons

| Class | Next to |
|---|---|
| `size-4` | `text-xs` / `text-sm` |
| `size-5` | `text-base` / `text-lg`, buttons, nav, icon buttons |
| `size-6` | large touch controls (Jump/Slide), dialog header badges |

## Radius

| Class | Used for |
|---|---|
| `rounded-full` | buttons, chips, pills, icon buttons, badges |
| `rounded-2xl` | cards, rows, list items, inputs-groups |
| `rounded-3xl` | dialogs and panels (outermost surfaces) |
| `rounded-xl` | media nested inside a padded card (card radius − padding) |

## Controls (shared components in `components/ui` and `screens/shared.tsx`)

| Control | Size |
|---|---|
| Primary button (`<Button variant="aurora">`) | `h-12 px-6 text-lg`, icon `size-5` |
| Secondary button (`<Button variant="frost" size="md">`) | `h-11 px-4 text-sm`, icon `size-4` |
| Chip-sized action (`<Button variant="frost" size="chip">`) | `h-9 px-3 text-sm`, icon `size-4` |
| Icon button (`<Button variant="frost" size="icon">`) | `size-10`, icon `size-5` |
| Chip (`<Chip>`, shared.tsx) | `h-9 px-3 gap-2 text-sm`, icon `size-4` |
| Badge (`<Badge>`, ui/badge) | `px-2 py-1 text-xs` |
| Row / list item (`ROW`, `<Row>` with icon tile) | `px-4 py-3 gap-3 rounded-2xl`; tile `size-10 rounded-xl` |
| Card (`CARD`) | `p-4 gap-3 rounded-2xl` |
| Dialog (`<DialogShell>`, `<Overlay>` + `PANEL`) | `p-4 sm:p-6 gap-4 rounded-3xl`; header badge `<IconBadge>` `size-12`, icon `size-6`; backdrop `p-4 sm:p-6` |
