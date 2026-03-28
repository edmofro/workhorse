# WH-020: Design library

**Status:** Not started
**Priority:** Medium
**Team:** Platform

## Summary

Each product has a `.workhorse/design/` directory in its codebase containing a living design library: design system documentation, reusable components, view layouts, and committed mockups. Everything in the design library is **design-only**: it doesn't need to be functional beyond allowing users to work through specs and providing visual context to the AI agent during implementation.

## Why

- Designers can iterate on UI without touching production code
- The AI uses design components and views as reference when generating mockups during spec interviews, so mockups are consistent with the product's actual look and feel
- Developers and AI agents reference the design library during implementation
- It's version-controlled (committed to the repo) so there's history and collaboration
- Committed mockups give AI agents concrete visual references when implementing specs

## What lives in `.workhorse/design/`

### Root-level design system documentation

The root of the design directory contains markdown files documenting the product's design conventions — colour palette, typography, spacing, border radii, shadows, interaction patterns, and overall design philosophy. How these are split across files is up to the project: it could be a single comprehensive document, or individual files for colours, typography, etc. The structure is configured per product.

These are the source of truth for the product's visual language. The AI references them when generating mockups, and designers maintain them through the design library explorer.

### `components/`

Reusable UI components as HTML/CSS — buttons, form fields, modals, date pickers, tables, etc. Each component file shows the component in its various states and variants.

### `views/`

Full page compositions showing how components come together into complete screens. These represent the product's actual screen layouts.

### `mockups/`

Committed mockups from spec interviews, organised by card number. Each card's mockups live in a subfolder. See WH-003 for the full mockup lifecycle (WIP state, committing, cleanup).

## Directory structure

```
.workhorse/
└── design/
    ├── design-system.md          # or split into colours.md, typography.md, etc.
    ├── components/
    │   ├── button.html
    │   ├── date-picker.html
    │   ├── modal.html
    │   ├── data-table.html
    │   └── form-field.html
    ├── views/
    │   ├── patient-registration.html
    │   ├── allergy-list.html
    │   └── lab-request-form.html
    └── mockups/
        ├── WH-042/
        │   └── allergy-detail.html
        └── WH-057/
            └── invoice-creation.html
```

## Mockup isolation: no imports from design library

Mockups **copy** relevant styles and component code directly rather than importing from `components/` or `views/`. This is deliberate:

- A designer editing a component through the design library explorer shouldn't inadvertently change committed mockups that represent a specific point-in-time design decision
- Each mockup is a self-contained snapshot of the intended design
- The AI generates mockups by referencing the design library for consistency, but the output is standalone HTML/CSS

## Editing restrictions

### Components and views — designer only

- Components and views in the design library require a designer to edit
- Editing happens through the design library explorer in Workhorse (yet to be specced)
- The AI agent must NOT edit anything in `components/` or `views/` during mockup development or implementation
- These are the product's design source of truth and changes must be intentional

### Mockups — AI can generate

- The AI generates mockups during spec interviews
- Mockups are self-contained and isolated from the design library's components/views
- The AI references the design library for visual consistency but does not depend on it at runtime

## Acceptance criteria

### Design area in Workhorse

- [ ] Each product has a design area accessible from the main navigation
- [ ] Browse the design library: design system docs, components, views, mockups
- [ ] Each item is viewable as a rendered preview (markdown for docs, HTML/CSS for components/views/mockups)
- [ ] Device toggle for viewing components, views, and mockups at different sizes

### Design system documentation

- [ ] Root-level markdown files describe the product's design conventions in detail
- [ ] Colour palette, typography, spacing, border radii, shadows, and patterns are all documented
- [ ] The AI references these documents when generating mockups

### Editing designs

- [ ] AI-assisted editing of components and views through the design library explorer
- [ ] Direct editing of the HTML/CSS (components/views) and markdown (docs)
- [ ] Inspector-style live editing: select an element, tweak CSS properties in a panel, see changes update in real time in the preview
- [ ] Edits are saved automatically (like specs) but not yet committed to the codebase
- [ ] Separate commit step to push design changes to the codebase and create a PR (same flow as committing specs)
- [ ] The AI agent does not edit components or views outside of the design library explorer context

### Mockup management

- [ ] Mockups are self-contained HTML/CSS — no imports from `components/` or `views/`
- [ ] Mockups copy relevant design library code rather than referencing it
- [ ] See WH-003 for mockup lifecycle acceptance criteria (WIP state, committing, spec linking)

### Connection to implementation

- [ ] AI agents search for relevant mockups by spec path when implementing
- [ ] Design system docs, components, and views serve as visual context for the implementing agent
- [ ] Mockups can be deleted after implementation without breaking any spec references

## Open questions

- **Shared vs per-product:** Should some design elements be shared across products (e.g., a BES design system), or is each product fully independent?
- **CSS framework:** Should the design library components use the product's actual CSS framework (Material-UI for Tamanu) or be framework-agnostic HTML/CSS?
- **Design library explorer:** The editing interface for designers to maintain components and views — needs its own spec.
- **Mockup cleanup policy:** Should there be tooling to flag stale mockups after implementation, or is manual cleanup sufficient?
