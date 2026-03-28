# WH-006: Spec format and information architecture

**Status:** Not started
**Priority:** High
**Team:** Platform

## Summary

Define the format specs are written in, how they're structured in the codebase, and how they map to the navigable hierarchy in Workhorse. The format must serve product owners (who author and review), developers and AI agents (who implement from them), and the spec explorer (which builds a navigable knowledge base from them).

## The problem

Specs need to work at three levels:
1. **Authoring** — product owners and testers develop them through the spec interview and direct editing. Must feel natural, not like writing code.
2. **Implementation** — developers and AI agents read them to know what to build. Must be precise and parseable.
3. **Knowledge base** — once merged, specs form a browsable reference for each product. Must be well-organised and navigable.

## Information hierarchy

Specs live in the codebase as markdown files. The directory structure defines the hierarchy:

```
.workhorse/specs/
├── patient/
│   ├── registration.md
│   ├── allergies.md
│   ├── merge/
│   │   ├── overview.md
│   │   ├── field-resolution.md
│   │   └── conflict-handling.md
│   └── referrals.md
├── scheduling/
│   ├── appointments.md
│   └── recurring-appointments.md
├── labs/
│   ├── requests.md
│   ├── results.md
│   └── integrations/
│       └── senaite.md
├── sync/
│   ├── facility-sync.md
│   └── mobile-sync.md
└── invoicing/
    ├── invoice-creation.md
    ├── payments/
    │   ├── payment-methods.md
    │   └── sliding-fee-scale.md
    └── refunds.md
```

Workhorse reads this tree from main to build the product spec explorer. The hierarchy is:

**Product → Area → Subarea → ... → Spec**

The hierarchy can nest arbitrarily deep. The directory structure is the hierarchy — no artificial depth limit. A path like `patient/merge/conflict-handling.md` could represent feature → area → subfeature → spec. Folders map to whatever granularity makes sense for the product.

## Spec file format

Each spec is a markdown file with a frontmatter header and structured content:

```markdown
---
title: Patient allergies
area: patient
card: WH-042
status: complete
---

Summary paragraph describing what this feature does.

## Section heading

- [ ] Acceptance criterion one
- [ ] Acceptance criterion two
- [ ] Acceptance criterion three

## Another section

- [ ] More criteria

## Open questions

> **Question label:** The question text here.
```

### Frontmatter fields

- `title` — human-readable feature name
- `area` — which area this belongs to (matches directory)
- `card` — Workhorse card ID that created/owns this spec (links back to chat, comments, mockups)
- `status` — `draft`, `complete`, `superseded`

### Content conventions

- **Summary** — plain paragraph at the top, no heading
- **Sections** — h2 headings to group related criteria
- **Acceptance criteria** — markdown checkbox items (`- [ ]`)
- **Open questions** — blockquotes with bold labels
- **No IDs on individual criteria** — keep it human-readable. If we need traceability later, Workhorse can manage that as an overlay (like McBean's Tracey approach) rather than polluting the authored format

## Acceptance criteria

### Format

- [ ] Specs are markdown files with YAML frontmatter
- [ ] Frontmatter includes: title, area, card reference, status
- [ ] Content uses standard markdown: headings, checkbox lists, blockquotes
- [ ] No special syntax or IDs that a product owner would need to manage
- [ ] Readable and editable in any text editor or GitHub's web UI

### Hierarchy

- [ ] Specs organised in directories by area within a top-level `.workhorse/specs/` directory
- [ ] Directory structure defines the navigation hierarchy in the spec explorer
- [ ] Areas are created as needed (no predefined list)
- [ ] The AI suggests which area a new spec should live in, based on codebase structure

### In Workhorse

- [ ] The spec editor produces output in this format
- [ ] The spec explorer reads the format from main branch
- [ ] Frontmatter is managed by Workhorse (user doesn't edit it manually in the app)
- [ ] Content is what the user edits

## Open questions

- **Tracey integration:** Should we support Tracey-style IDs as an optional layer that Workhorse manages? This would enable code-to-spec traceability without burdening the author. Probably a future feature.
- **Versioning:** Rely on git history (simpler) or explicit version numbers in frontmatter?
- **Cross-references:** How do specs reference each other? Markdown links between files? A `related` field in frontmatter?
- ~~Hierarchy depth:~~ Resolved: arbitrary nesting via directories.
