---
title: Workhorse design system
status: complete
---
# Workhorse Design System

Workhorse is a spec-driven development workbench. The interface should feel like a sharp, quiet tool — professional and polished with a touch of warmth and character, in the lineage of Linear, GitHub, and Raycast.

## Design philosophy

**Every element earns its space.** Before adding anything — a label, a badge, an icon, a divider — ask: does this help the user do something, or understand something they couldn't already? If a label states what the user can already see from context ("New spec", "Editing", "Viewing"), it's clutter. If a status badge repeats information the surrounding UI already communicates, remove it. Low density, generous whitespace, room to breathe. When in doubt, take it out.

**No redundancy.** If two elements serve the same purpose, one shouldn't exist. This applies to controls (don't show two buttons that do the same thing), labels (don't label what's self-evident), and information (don't show the same data in two places). Redundancy is the primary source of clutter.

**Consistency across surfaces.** The same content should look the same everywhere. A spec body should render as formatted markdown whether viewed in the spec browser, the card spec tab, or a chat extract — never as plain text in one place and rich text in another. Labels, inputs, and metadata should use the same sizing and colour treatment throughout the app, not vary by page.

**Compact contexts need compact spacing.** Spacing values from this guide are calibrated for primary workspace widths (680–720px). When a component appears in a narrower context — a 320px sidebar, a 200px file list, a floating panel — tighten margins and padding proportionally. A 28px gap between chat messages is generous at full width but wasteful in a sidebar. Use judgement: the goal is breathing room relative to the container, not absolute pixel values everywhere.

**Warmth through restraint.** The warm stone palette, the rounded corners, the subtle shadows — these give the interface character. Subtle decorative elements like muted icons on functional nav items are welcome when used sparingly; they add warmth without adding noise. But decoration should never compete with content. No sparkle icons, no magic imagery, no purple "AI" badges, no gradients on UI elements.

**AI is normal.** The AI is simply how the tool works — a colleague, not a novelty. The AI avatar is a neutral "W" in a muted circle. No special treatment, no "powered by AI" labels, no distinct visual language for AI-generated content versus human content.

**Primary workspace gets primary space.** The chat and spec editor are where people spend their time. They get generous width and aren't crammed into side panels.

---

## Colour palette

The palette is warm neutral — stone-based greys with a burnt orange accent. No cool greys, no blue-greys. The warmth is subtle but consistent.

### Backgrounds

| Token | Value | Usage |
|---|---|---|
| `--bg-page` | `#f8f7f4` | Page background, stage areas, toggle containers |
| `--bg-surface` | `#ffffff` | Cards, panels, topbar, chat input, active nav items |
| `--bg-sidebar` | `#f1efeb` | Sidebar background |
| `--bg-hover` | `#edeae5` | Hover state on interactive elements |
| `--bg-inset` | `#e8e5df` | Inset/recessed areas, AI avatar background |
| `--bg-mockup-stage` | `#e5e3de` | Mockup viewer stage surround |

### Text

| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `#1c1917` | Headings, titles, active navigation |
| `--text-secondary` | `#57534e` | Body text, descriptions, chat messages |
| `--text-muted` | `#a8a29e` | Labels, metadata, timestamps, section headers |
| `--text-faint` | `#d1cdc6` | Placeholders, disabled states |

### Borders

| Token | Value | Usage |
|---|---|---|
| `--border-default` | `#dfdcd5` | Input borders, card borders on hover, dividers |
| `--border-subtle` | `#eae7e1` | Card borders at rest, section separators, panel edges |

### Accent and semantic colours

| Token | Value | Usage |
|---|---|---|
| `--accent` | `#c2410c` | Primary actions, logo, selected states, focus rings |
| `--accent-hover` | `#b33b09` | Hover state on accent buttons |
| `--green` | `#16a34a` | Checkboxes, complete status, spec extraction blocks |
| `--amber` | `#b45309` | In-progress status, warnings, open questions |
| `--blue` | `#2563eb` | Team dots (secondary), links |

### Diff colours

Used exclusively for code and spec diff views. These sit alongside the warm-neutral palette without clashing — the green is the same `--green` already in the palette, and the red is a warm-leaning red that harmonises with the stone tones.

| Token | Value | Usage |
|---|---|---|
| `--diff-green` | `#16a34a` | Diff addition indicator text (same as `--green`) |
| `--diff-green-bg` | `rgba(22,163,74,0.07)` | Diff addition line background |
| `--diff-red` | `#dc2626` | Diff removal indicator text |
| `--diff-red-bg` | `rgba(220,38,38,0.07)` | Diff removal line background |
| `--diff-hunk-bg` | `rgba(37,99,235,0.06)` | Diff hunk header background (uses palette `--blue`) |

### Semantic backgrounds (low-opacity tints)

| Colour | Background | Usage |
|---|---|---|
| Accent | `rgba(194,65,12,0.06)` | Accent-tinted highlights |
| Green | `rgba(22,163,74,0.07)` | Spec extraction blocks, complete indicators |
| Amber | `rgba(180,83,9,0.06)` | Open question blocks, in-progress indicators |

### Colours to avoid

- No purple (`#7c3aed`, `#6e56cf`, etc.) — removed from the palette entirely
- No gradients on avatars, badges, or backgrounds
- No opacity variants below `0.05` or above `0.15`

---

## Typography

### Font stack

```
Primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Monospace: ui-monospace, 'SF Mono', 'Cascadia Code', monospace
```

Monospace is used only for feature identifiers (e.g. `WH-042`) and file paths. Everything else uses Inter.

### Type scale

| Element | Size | Weight | Letter-spacing | Line-height | Colour |
|---|---|---|---|---|---|
| Document title (h1) | 24px | 700 | -0.03em | 1.3 | `--text-primary` |
| Page title | 16px | 600 | -0.02em | 1.3 | `--text-primary` |
| Feature title (topbar) | 15px | 600 | -0.01em | 1.3 | `--text-primary` |
| Card title | 14px | 500 | 0 | 1.4 | `--text-primary` |
| Body text / chat | 14px | 400 | 0 | 1.7 | `--text-secondary` |
| Card description | 13px | 400 | 0 | 1.5 | `--text-muted` |
| Nav item | 13px | 450 | 0 | 1.5 | `--text-secondary` |
| Nav item (active) | 13px | 500 | 0 | 1.5 | `--text-primary` |
| Feature ID | 12px | 500 | 0 | 1.3 | `--text-muted` |
| Button text | 12px | 500 | 0 | 1 | varies |
| Section label | 11px | 600 | 0.06em | 1.3 | `--text-muted` |
| Tag text | 11px | 500 | 0 | 1 | semantic |
| Timestamp | 11px | 400 | 0 | 1 | `--text-faint` |

### Section labels

All-caps labels used for nav sections ("Products", "Teams") and metadata group headers ("Activity"):

```css
font-size: 11px;
font-weight: 600;
color: var(--text-muted);
text-transform: uppercase;
letter-spacing: 0.06em;
```

---

## Spacing

Base unit: **4px**. All spacing values are multiples of 4.

| Value | Usage |
|---|---|
| 4px | Tight inline gaps (icon to text in tags) |
| 8px | Between list items, between tags, small gaps |
| 12px | Internal padding on small components |
| 16px | Card vertical padding, section gaps |
| 18px | Card horizontal padding |
| 20px | Panel padding |
| 24px | Sidebar nav horizontal padding, topbar horizontal padding |
| 28px | Card list top padding, chat input bottom padding |
| 32px | Card list horizontal padding, conversation top padding |
| 48px | Spec document top padding |

### Key measurements

| Element | Size |
|---|---|
| Sidebar width | 216px |
| Topbar height | 52px |
| Conversation max-width | 680px |
| Spec document max-width | 720px |
| Files panel width | ~180px |

---

## Border radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Checkboxes, small inline elements |
| `--radius-md` | 6px | Nav items, toggle buttons |
| `--radius-default` | 8px | Buttons, inputs, view toggles, tags |
| `--radius-lg` | 10px | Cards, mockup frames |
| `--radius-xl` | 12px | Chat input, floating panels |
| `--radius-pill` | 24px | Chat pill button |
| `--radius-round` | 50% | Avatars, status dots |

---

## Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(28,25,23,0.04)` | Cards at rest, active nav, secondary buttons |
| `--shadow-md` | `0 2px 8px rgba(28,25,23,0.06)` | Cards on hover |
| `--shadow-lg` | `0 12px 40px rgba(28,25,23,0.14), 0 2px 8px rgba(28,25,23,0.06)` | Floating panels, overlays |
| `--shadow-input-focus` | `0 0 0 3px rgba(194,65,12,0.05)` | Input focus ring |

Shadows are subtle. Non-floating elements never use anything heavier than `--shadow-md`.

---

## Transitions

- Hover/focus: `0.1s` ease (default)
- Input focus ring: `0.15s` (slightly slower for smoothness)
- Maximum transition: `0.2s` — nothing longer
- Device toggle frame resize: `0.3s ease` (the one exception)
- Quick, subtle transitions (opacity fades, gentle cross-fades) are fine for content swaps and state changes — keep them ≤ 0.15s so they feel instant but smooth
- No bounces, spring physics, slide-ins, or scale animations on layout elements
- Continuous animations (`animate-pulse`, `animate-spin`) are permitted for loading/streaming indicators — keep them small and text-only or icon-only, never on large regions

---

## Layout

### App shell

The app uses a fixed sidebar (216px) with a main content area. The topbar (52px) sits at the top of the main area, not spanning the full width.

```
+--sidebar--+--main---------------------+
|            | topbar                    |
|  logo      |--------------------------|
|  products  |                           |
|  teams     |  content area             |
|            |                           |
|  user      |                           |
+------------+---------------------------+
```

### Three primary views

**Cards view** — Feature list grouped by status (Specifying, Not started, Spec complete). Each group has a status dot, title, and count. Cards stack vertically.

**Chat view** — Full-width scrollable conversation centred at 680px max-width. Input fixed at the bottom, also centred.

**Artifact view** — Chat column on the left (~40%), artifact (spec or mockup) on the right (~60%). Files panel collapsed on right edge, hover to peek. Specs and mockups share this layout.

### Navigation

The sidebar contains product names and team names with coloured dots. Functional nav items (Specs, Design) may use subtle muted icons for warmth — these are decorative, not informational, and should be used sparingly. Product names and team names rely on text alone. No view toggle in the topbar — view state transitions happen through interactions (clicking files, sending messages, closing artifacts).

---

## Components

### Card

```css
background: var(--bg-surface);
border: 1px solid var(--border-subtle);
border-radius: 10px;
padding: 16px 18px;
margin-bottom: 8px;
box-shadow: var(--shadow-sm);
cursor: pointer;
transition: border-color 0.1s, box-shadow 0.1s;
```

On hover: `border-color: var(--border-default); box-shadow: var(--shadow-md);`

Cards contain: identifier (monospace, muted), title, optional description (two lines max, truncated), footer with tags and assignee avatar.

### Button (primary)

```css
padding: 7px 14px;
border-radius: 8px;
font-size: 12px;
font-weight: 500;
background: var(--accent);
color: white;
border: none;
cursor: pointer;
```

### Button (secondary)

```css
padding: 7px 14px;
border-radius: 8px;
font-size: 12px;
font-weight: 500;
background: var(--bg-surface);
color: var(--text-secondary);
border: 1px solid var(--border-default);
box-shadow: var(--shadow-sm);
```

### View toggle (segmented control)

Container: `background: var(--bg-page); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 2px; gap: 1px;`

Inactive button: `padding: 5px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; color: var(--text-muted);`

Active button: `background: var(--bg-surface); color: var(--text-primary); box-shadow: var(--shadow-sm);`

### Avatar

Standard: `22px` circle. Chat: `26px` circle.

Human avatar: accent background, white initial letter.
AI avatar: inset background, secondary text colour, displays "W".

### Chat input

Full-width mode (main chat): `border-radius: 12px; padding: 6px 6px 6px 16px;`

Compact mode (sidebar chat): `padding: 4px 4px 4px 12px;` within a container padded `12px 16px`.

Both modes: white background, default border, shadow-sm. On focus: accent border + focus ring shadow.

Send button inside: `padding: 8px 16px; background: var(--accent); border-radius: 8px;`

### Tags

```css
padding: 2px 8px;
border-radius: 5px;
font-size: 11px;
font-weight: 500;
```

"core" tag: amber background tint, amber text.
"future" tag: inset background, muted text.

### Status dots

- In progress: 8px circle, amber fill
- Not started: 8px circle, default border (hollow)
- Complete: 8px circle, green fill

### Spec extraction block (in chat)

Green-tinted background (`rgba(22,163,74,0.07)`), 8px radius, 14px 16px padding. Label is uppercase green, 11px, 600 weight.

### Open question block (in spec)

Amber-tinted background (`rgba(180,83,9,0.06)`), 8px radius, 14px 16px padding. Label is uppercase amber, 11px, 600 weight.

### Mockup artifact

Mockups open in the same chat + artifact layout as specs (no full-screen overlay). Device toggle uses text labels ("Desktop", "Tablet", "Mobile") not icons, styled as a segmented control in the artifact header bar. Stage area within the artifact uses `--bg-mockup-stage`. In edit mode, the artifact splits: preview on top, editor panel (Properties/Source tabs) on bottom.

---

## Scrollbar

```css
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 3px; }
```

Thin and unobtrusive. Matches the warm neutral palette.

---

## Responsiveness & perceived performance

**The UI must feel instant.** Interactions like clicking a card or opening a conversation should produce visible feedback within one frame. If data takes time to load, the structural chrome (topbar, sidebar, layout) should appear immediately with skeleton placeholders for the content. The user should never stare at a frozen screen wondering whether their click registered.

### Principles

- **Loading states are not optional.** Every page must have a `loading.tsx` that renders a skeleton matching the page's eventual layout. Skeletons use `animate-pulse` on `bg-[var(--bg-inset)]` blocks shaped to approximate the real content — never a full-page spinner.
- **Independent data loads independently.** If one query is slow (e.g. fetching specs from a remote repo), it must not block the rest of the page from rendering. Use `Promise.all` for independent server-side fetches. Use Suspense boundaries to stream sections that depend on slower data.
- **Navigation feels instant.** Clicking a link should immediately show the skeleton for the target page. The layout (sidebar, topbar) should remain stable — only the content area transitions.
- **No stale data masquerading as fresh.** Caching is encouraged for expensive operations (GitHub API calls, permission checks), but cached data must have a bounded TTL and must not cause the user to see outdated state for important things like card status or conversation messages.
- **Optimistic updates for user actions.** When a user changes a card's status, adds a tag, or posts a comment, the UI should reflect the change immediately before the server confirms. Roll back gracefully on failure.

### What to avoid

- Full-page loading spinners or blank white screens during navigation
- Sequential data fetches that could run in parallel (waterfall queries)
- Blocking the entire page on a single slow operation (e.g. a GitHub API call)
- Heavy client-side data refetching on every mount with no caching layer
- Skeleton layouts that don't match the actual page structure (causes layout shift)

---

## Things to avoid

These aren't just a checklist — they reflect the philosophy above. When reviewing UI, look for the *pattern* behind each rule, not just the literal item.

### Clutter and redundancy
- Labels that state the obvious ("Viewing", "Generated from...", "New spec", "Editing") — if the user already knows from context, the label is noise
- Status badges or indicators that duplicate information already visible in the UI (e.g. marking sidebar items "new"/"editing" when every item is already in a working context)
- Breadcrumbs near sidebar items that navigate to the same place
- Progress bars and completion percentages — these create anxiety and false precision; use simple text summaries instead
- Dense information layouts — if it feels busy, step back and ask what can be removed entirely, not just made smaller
- Multiple controls that do the same action

### Layout stability
- Never conditionally render topbar buttons based on transient state (e.g. showing a button only in one status). Buttons that appear and disappear shift neighbouring elements and flash distractingly during loading. If an action is just a status change, use the existing status dropdown instead of adding a dedicated button
- Fixed chrome (topbar, sidebar, navigation tabs) must have a stable layout regardless of data state. Content that varies by status belongs in the content area, not in persistent navigation controls

### Visual discipline
- Purple or gradient accents — not in the palette
- Sparkle, wand, or magic icons anywhere — AI is normal, not magical
- Borders heavier than 1px
- Shadows heavier than `--shadow-md` on non-floating elements
- Any animation longer than 0.3s
- Heavy entrance/exit animations (slide-in, scale-up, bounces, spring physics) — quick opacity fades ≤ 0.15s are fine for content swaps
- Monospace font for anything other than identifiers and file paths
- Cool greys or blue-greys — the palette is warm throughout, including overlays and backdrops (use `rgba(28,25,23,...)` not `rgba(0,0,0,...)`)
- Colours outside the defined palette — don't invent new tints or use similar-but-different values (e.g. emerald `#10b981` when the design green is `#16a34a`)

### Inconsistency
- Rendering the same content differently on different surfaces (e.g. plain text in one view, markdown in another)
- Using different font sizes, weights, or colours for the same type of element across pages (e.g. field labels at 13px on one page and 12px on another)
- Applying full-width spacing in compact contexts — spacing should feel proportional to the container, not rigidly identical everywhere