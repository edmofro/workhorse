---
title: Design library
area: design-library
card: WH-020
---

Each product has a `.workhorse/design/` directory in its codebase containing a living design library: design system documentation, reusable components, view layouts, and committed mockups. Everything in the design library is design-only: it doesn't need to be functional beyond allowing users to work through specs and providing visual context to the AI agent during implementation.

## Why

Designers can iterate on UI without touching production code. The AI uses design components and views as reference when generating mockups during agent sessions, so mockups are consistent with the product's actual look and feel. Developers and AI agents reference the design library during implementation. It's version-controlled so there's history and collaboration. Committed mockups give AI agents concrete visual references when implementing specs.

## What lives in `.workhorse/design/`

### Root-level design system documentation

The root of the design directory contains markdown files documenting the product's design conventions — colour palette, typography, spacing, border radii, shadows, interaction patterns, and overall design philosophy. The structure is configured per product: it could be a single comprehensive document, or individual files for colours, typography, etc.

### `components/`

Reusable UI components as HTML/CSS — buttons, form fields, modals, date pickers, tables, etc. Each component file shows the component in its various states and variants.

### `views/`

Full page compositions showing how components come together into complete screens. These represent the product's actual screen layouts.

### `mockups/`

Committed mockups from agent sessions, organised by card number. Each card's mockups live in a subfolder. See WH-003 for the full mockup lifecycle.

## Directory structure

```
.workhorse/
└── design/
    ├── design-system.md
    ├── components/
    │   ├── button.html
    │   ├── date-picker.html
    │   └── modal.html
    ├── views/
    │   ├── patient-registration.html
    │   └── allergy-list.html
    └── mockups/
        ├── WH-042/
        │   └── allergy-detail.html
        └── WH-057/
            └── invoice-creation.html
```

## Mockup isolation

Mockups copy relevant styles and component code directly rather than importing from `components/` or `views/`. A designer editing a component through the design library explorer shouldn't inadvertently change committed mockups that represent a specific point-in-time design decision. Each mockup is a self-contained snapshot.

## Design area in Workhorse

- [x] Each product has a design area accessible from the main navigation
- [x] Browse the design library: design system docs, components, views, mockups
- [x] Each item is viewable as a rendered preview (markdown for docs, HTML/CSS for components/views/mockups)
- [ ] Device toggle for viewing components, views, and mockups at different sizes

## Design system documentation

- [x] Root-level markdown files describe the product's design conventions in detail
- [x] Colour palette, typography, spacing, border radii, shadows, and patterns are all documented
- [x] Markdown frontmatter is stripped from rendered output (title, status, etc. are not shown as raw text)
- [x] Markdown tables render correctly as styled HTML tables
- [ ] The AI references these documents when generating mockups

## Editing designs

Design library files use the same editing interfaces as specs within a card, but commit directly to the default branch (main) rather than going through the card workflow. There is no intermediate worktree or PR step — saves commit immediately.

### Markdown files

- [x] Markdown docs are editable using the same rich/raw editor as the spec editor within a card
- [x] Edit button toggles between view and edit mode
- [x] Rich editor mode shows sections as structured editable blocks (heading + content)
- [x] Raw markdown mode for full control
- [x] Auto-save with debounce commits directly to the default branch via the GitHub API
- [x] Frontmatter is preserved during editing but hidden in view mode

### HTML files (components, views, mockups)

- [x] HTML files use the same artifact viewer as mockups within a card (rendered preview, not full-screen overlay)
- [x] Device toggle (Desktop / Tablet / Mobile) for responsive preview
- [x] Chat column for AI conversational edits (same layout as card artifact mode)
- [x] Edit mode: split view with preview on top, editor panel (Properties/Source tabs) on bottom — same as mockup editing within a card (see `visual-mockups.md`)
- [x] Auto-save with debounce commits directly to the default branch
- [ ] AI chat is wired to an agent endpoint for live design edits (placeholder for now)

### Commit behaviour

- [x] All design library edits commit directly to the default branch — no PR, no card workflow
- [x] Commit messages are auto-generated from the file path (e.g. "Update design-system.md")
- [ ] The AI agent does not edit components or views outside of the design library explorer context

## Mockup management

- [ ] Mockups are self-contained HTML/CSS — no imports from `components/` or `views/`
- [ ] Mockups copy relevant design library code rather than referencing it
- [ ] See WH-003 for mockup lifecycle acceptance criteria (WIP state, committing, spec linking)

## Connection to implementation

- [ ] AI agents search for relevant mockups by spec path when implementing
- [ ] Design system docs, components, and views serve as visual context for the implementing agent
- [ ] Mockups can be deleted after implementation without breaking any spec references

## Open questions

> **Shared vs per-product:** Should some design elements be shared across products (e.g., a BES design system), or is each product fully independent?

> **CSS framework:** Should the design library components use the product's actual CSS framework (Material-UI for Tamanu) or be framework-agnostic HTML/CSS?

> **Design library explorer:** The editing interface for designers to maintain components and views — needs its own spec.

> **Mockup cleanup policy:** Should there be tooling to flag stale mockups after implementation, or is manual cleanup sufficient?
