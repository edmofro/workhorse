# Workhorse Design Guide

All AI-generated code and human contributions must follow these guidelines. This document is the single source of truth for visual decisions.

## Principles

1. **Clean and uncluttered.** When in doubt, remove it. Every element must earn its space. Low density, generous whitespace, room to breathe.
2. **No redundancy.** If two elements do the same thing, one of them shouldn't exist. This is a major source of clutter.
3. **AI is normal.** No sparkle icons, no magic imagery, no purple "AI" badges. AI is just how the tool works. The AI avatar is a neutral "W" in a muted circle.
4. **Primary workspace gets primary space.** The chat and spec editor are where people spend their time. They get generous width — never crammed into a side panel.
5. **Professional with character.** In the lineage of Linear, GitHub, Raycast. Purposeful, calm, refined, confident.

---

## Colour tokens

### Backgrounds

| Token | Hex | Usage |
|---|---|---|
| `--bg-page` | `#f8f7f4` | Page background, stage areas |
| `--bg-surface` | `#ffffff` | Cards, panels, topbar, chat input |
| `--bg-sidebar` | `#f1efeb` | Sidebar background |
| `--bg-hover` | `#edeae5` | Hover state on interactive elements |
| `--bg-inset` | `#e8e5df` | Inset/recessed areas, AI avatar background |
| `--bg-mockup-stage` | `#e5e3de` | Mockup preview stage (non-desktop) |

### Text

| Token | Hex | Usage |
|---|---|---|
| `--text-primary` | `#1c1917` | Headings, titles, card titles, active nav |
| `--text-secondary` | `#57534e` | Body text, descriptions, chat messages |
| `--text-muted` | `#a8a29e` | Labels, metadata, timestamps, section headers |
| `--text-faint` | `#d1cdc6` | Placeholder text, disabled states |

### Borders

| Token | Hex | Usage |
|---|---|---|
| `--border-default` | `#dfdcd5` | Input borders, card borders on hover, dividers |
| `--border-subtle` | `#eae7e1` | Card borders at rest, section separators, panel borders |

### Accent and semantic

| Token | Hex | Opacity variant | Usage |
|---|---|---|---|
| `--accent` | `#c2410c` | `rgba(194,65,12,0.06)` | Primary actions, logo, selected states, input focus |
| `--accent-hover` | `#b33b09` | — | Hover state on accent buttons |
| `--green` | `#16a34a` | `rgba(22,163,74,0.07)` | Checkboxes, complete status, spec extraction blocks |
| `--amber` | `#b45309` | `rgba(180,83,9,0.06)` | In-progress status, warnings, open questions |
| `--blue` | `#2563eb` | — | Team dots (secondary), links |

### Forbidden

- No purple (`#7c3aed`, `#6e56cf`, etc.) — removed from palette entirely
- No gradients on avatars, badges, or backgrounds
- No opacity variants below 0.05 (invisible) or above 0.15 (too heavy)

---

## Typography

### Font stack

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

No monospace font loaded globally. Monospace only used inline for feature IDs via system mono:

```css
font-family: ui-monospace, 'SF Mono', 'Cascadia Code', monospace;
```

### Scale

| Element | Size | Weight | Letter-spacing | Line-height | Colour |
|---|---|---|---|---|---|
| Page title (h1) | `16px` | `600` | `-0.02em` | `1.3` | `--text-primary` |
| Feature title in topbar | `15px` | `600` | `-0.01em` | `1.3` | `--text-primary` |
| Card title | `14px` | `500` | `0` | `1.4` | `--text-primary` |
| Body text / chat messages | `14px` | `400` | `0` | `1.7` | `--text-secondary` |
| Card description | `13px` | `400` | `0` | `1.5` | `--text-muted` |
| Nav item | `13px` | `450` (active: `500`) | `0` | `1.5` | `--text-secondary` (active: `--text-primary`) |
| Section label / nav label | `11px` | `600` | `0.06em` | `1.3` | `--text-muted` |
| Feature ID | `12px` | `500` | `0` | `1.3` | `--text-muted` |
| Button text | `12px` | `500` | `0` | `1` | varies |
| Tag text | `11px` | `500` | `0` | `1` | semantic colour |
| Timestamp | `11px` | `400` | `0` | `1` | `--text-faint` |

### Section labels (uppercase)

```css
font-size: 11px;
font-weight: 600;
color: var(--text-muted);
text-transform: uppercase;
letter-spacing: 0.06em;
```

### Spec document typography

| Element | Size | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|
| Document title (h1) | `24px` | `700` | `-0.03em` | `1.3` |
| Section heading (h2) | `16px` | `600` | `-0.01em` | `1.3` |
| Body paragraph | `14px` | `400` | `0` | `1.75` |
| Checklist item | `14px` | `400` | `0` | `1.6` |
| Open question text | `13px` | `400` | `0` | `1.6` |

---

## Spacing

Base unit: `4px`. All spacing values are multiples of 4.

### Standard spacing scale

| Token | Value | Usage |
|---|---|---|
| `--space-1` | `4px` | Tight inline gaps (icon to text in a tag) |
| `--space-2` | `8px` | Between list items, between tags, small component gaps |
| `--space-3` | `12px` | Internal padding on small components (tags, chips) |
| `--space-4` | `16px` | Card internal padding (vertical), section gaps |
| `--space-5` | `18px` | Card internal padding (horizontal) |
| `--space-6` | `20px` | Panel padding, sidebar footer/header padding |
| `--space-7` | `24px` | Page-level horizontal padding (sidebar nav), topbar horizontal padding |
| `--space-8` | `28px` | Card list top padding |
| `--space-9` | `32px` | Card list horizontal padding, conversation top padding |
| `--space-10` | `48px` | Spec document top padding |

### Specific measurements

| Element | Measurement |
|---|---|
| Sidebar width | `216px` |
| Topbar height | `52px` |
| Conversation max-width | `680px` |
| Spec document max-width | `720px` |
| Chat sidebar width (spec view) | `320px` |
| Floating chat width | `640px` |
| Floating chat max-height | `60vh` |
| Card margin-bottom | `8px` |
| Group margin-bottom | `32px` |

---

## Border radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Checkboxes, small inline elements |
| `--radius-md` | `6px` | Nav items, sidebar active state, device toggle buttons |
| `--radius-default` | `8px` | Buttons, input boxes, view toggles, tags, visual blocks |
| `--radius-lg` | `10px` | Cards, mockup frames |
| `--radius-xl` | `12px` | Chat input box, floating chat panel, spec document content editable hover |
| `--radius-pill` | `24px` | Chat pill (minimised floating chat) |
| `--radius-round` | `50%` | Avatars, status dots, team dots |

---

## Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(28,25,23,0.04)` | Cards at rest, active nav items, secondary buttons |
| `--shadow-md` | `0 2px 8px rgba(28,25,23,0.06)` | Cards on hover |
| `--shadow-lg` | `0 12px 40px rgba(28,25,23,0.14), 0 2px 8px rgba(28,25,23,0.06)` | Floating chat panel, chat pill |
| `--shadow-input-focus` | `0 0 0 3px rgba(194,65,12,0.05)` | Input focus ring |

---

## Components — exact specs

### Card

```css
background: var(--bg-surface);
border: 1px solid var(--border-subtle);
border-radius: var(--radius-lg);          /* 10px */
padding: 16px 18px;
margin-bottom: 8px;
box-shadow: var(--shadow-sm);
cursor: pointer;
transition: border-color 0.1s, box-shadow 0.1s;
```

Hover:
```css
border-color: var(--border-default);
box-shadow: var(--shadow-md);
```

### Button — primary

```css
padding: 7px 14px;
border-radius: var(--radius-default);     /* 8px */
font-size: 12px;
font-weight: 500;
background: var(--accent);                /* #c2410c */
color: #ffffff;
border: none;
cursor: pointer;
```

### Button — secondary

```css
padding: 7px 14px;
border-radius: var(--radius-default);     /* 8px */
font-size: 12px;
font-weight: 500;
background: var(--bg-surface);            /* #ffffff */
color: var(--text-secondary);             /* #57534e */
border: 1px solid var(--border-default);  /* #dfdcd5 */
box-shadow: var(--shadow-sm);
```

### View toggle (segmented control)

Container:
```css
display: flex;
background: var(--bg-page);              /* #f8f7f4 */
border: 1px solid var(--border-subtle);  /* #eae7e1 */
border-radius: var(--radius-default);    /* 8px */
padding: 2px;
gap: 1px;
```

Button (inactive):
```css
padding: 5px 14px;
border-radius: var(--radius-md);         /* 6px */
font-size: 12px;
font-weight: 500;
background: transparent;
color: var(--text-muted);
```

Button (active):
```css
background: var(--bg-surface);
color: var(--text-primary);
box-shadow: var(--shadow-sm);
```

### Avatar

```css
width: 22px;
height: 22px;
border-radius: 50%;
font-size: 10px;
font-weight: 600;
display: flex;
align-items: center;
justify-content: center;
```

Human avatar: `background: var(--accent); color: white;`
AI avatar: `background: var(--bg-inset); color: var(--text-secondary);` — displays "W"

Chat avatars are slightly larger: `width: 26px; height: 26px;`

### Chat input

```css
display: flex;
align-items: flex-end;
background: var(--bg-surface);
border: 1px solid var(--border-default);
border-radius: var(--radius-xl);          /* 12px */
padding: 6px 6px 6px 16px;
box-shadow: var(--shadow-sm);
```

Focus:
```css
border-color: var(--accent);
box-shadow: var(--shadow-input-focus);
```

Send button inside input:
```css
padding: 8px 16px;
background: var(--accent);
color: white;
border-radius: var(--radius-default);     /* 8px */
font-size: 13px;
font-weight: 500;
```

### Checkbox (spec items)

```css
width: 16px;
height: 16px;
border-radius: var(--radius-sm);          /* 4px */
flex-shrink: 0;
```

Empty: `border: 1.5px solid var(--border-default);`
Done: `background: var(--green); color: white; font-size: 10px; font-weight: 700;` (displays ✓)

### Tag

```css
padding: 2px 8px;
border-radius: 5px;
font-size: 11px;
font-weight: 500;
```

Tag "core": `background: rgba(180,83,9,0.06); color: var(--amber);`
Tag "future": `background: var(--bg-inset); color: var(--text-muted);`

### Status dots (in group headers)

In progress: `width: 8px; height: 8px; border-radius: 50%; background: var(--amber);`
Not started: `width: 8px; height: 8px; border-radius: 50%; border: 2px solid var(--border-default);`
Complete: `width: 8px; height: 8px; border-radius: 50%; background: var(--green);`

### Spec extraction block (in chat)

```css
padding: 14px 16px;
background: rgba(22,163,74,0.07);
border-radius: var(--radius-default);     /* 8px */
```

Label: `font-size: 11px; font-weight: 600; color: var(--green); text-transform: uppercase; letter-spacing: 0.04em;`

### Open question block (in spec document)

```css
padding: 14px 16px;
background: rgba(180,83,9,0.06);
border-radius: var(--radius-default);     /* 8px */
```

Label: `font-size: 11px; font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 0.04em;`

---

## Transitions

All hover/focus transitions: `0.1s` ease (default).

Input focus transitions: `0.15s` (slightly slower for the ring to feel smooth).

No transitions longer than `0.2s`. No animations except the device toggle frame resize (`0.3s ease`).

---

## Scrollbar

```css
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 3px; }
```

---

## What to avoid

- Breadcrumbs near sidebar items that navigate to the same place
- Labels that state the obvious ("Viewing", "Generated from...")
- Progress bars and completion percentages (not in v1)
- Purple or gradient accents
- Sparkle, wand, or magic icons
- Dense information layouts — if it feels busy, remove things
- Multiple controls that do the same action
- Repos in the sidebar navigation
- Monospace font for anything other than feature IDs
- Borders heavier than 1px
- Shadows heavier than `--shadow-md` on non-floating elements
