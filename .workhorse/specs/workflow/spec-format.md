---
title: Spec format and information architecture
area: workflow
card: WH-006
status: draft
---

Defines the format specs are written in, how they're structured in the codebase, and how they map to the navigable hierarchy in Workhorse. The format must serve product owners (who author and review), developers and AI agents (who implement from them), and the spec explorer (which builds a navigable knowledge base from them).

## The problem

Specs need to work at three levels: authoring (product owners and testers develop them through the spec interview and direct editing — must feel natural, not like writing code), implementation (developers and AI agents read them to know what to build — must be precise and parseable), and knowledge base (once merged, specs form a browsable reference for each product — must be well-organised and navigable).

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
└── labs/
    ├── requests.md
    └── results.md
```

The hierarchy is: **Product > Area > Subarea > ... > Spec**. Arbitrary nesting depth. The directory structure is the hierarchy — no artificial depth limit.

## Spec file format

Each spec is a markdown file with YAML frontmatter and structured content:

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
- **No IDs on individual criteria** — keep it human-readable. Workhorse can manage traceability as an overlay if needed

### Voice and framing

- **Specs describe the system as it should be, not the changes to make.** Each spec is a coherent snapshot — it reads as "this is how the system works" rather than "change X to Y" or "no longer does Z". No references to "current behaviour", "remains unchanged", "now does", or "rather than the old way". The implementation agent receives a diff to work out what needs to change.
- Acceptance criteria are stated as facts about the system's behaviour, not instructions to a developer.

## Format

- [ ] Specs are markdown files with YAML frontmatter
- [ ] Frontmatter includes: title, area, card reference, status
- [ ] Content uses standard markdown: headings, checkbox lists, blockquotes
- [ ] No special syntax or IDs that a product owner would need to manage
- [ ] Readable and editable in any text editor or GitHub's web UI

## Hierarchy

- [ ] Specs organised in directories by area within a top-level `.workhorse/specs/` directory
- [ ] Directory structure defines the navigation hierarchy in the spec explorer
- [ ] Areas are created as needed (no predefined list)
- [ ] The AI suggests which area a new spec should live in, based on codebase structure

## In Workhorse

- [ ] The spec editor produces output in this format
- [ ] The spec explorer reads the format from main branch
- [ ] Frontmatter is managed by Workhorse (user doesn't edit it manually in the app)
- [ ] Content is what the user edits

## Open questions

> **Tracey integration:** Should we support Tracey-style IDs as an optional layer that Workhorse manages? This would enable code-to-spec traceability without burdening the author. Probably a future feature.

> **Versioning:** Rely on git history (simpler) or explicit version numbers in frontmatter?

> **Cross-references:** How do specs reference each other? Markdown links between files? A `related` field in frontmatter?
