---
title: Human-readable labels for specs and mockups
area: ui
card: WH-014
status: draft
---

Wherever Workhorse displays a reference to a spec, mockup, or design library file, it shows a clean human-readable label rather than a raw file path or filename. This applies consistently across all surfaces: the files panel, spec explorer, design library browser, and chat notifications.

## Label derivation

The label for any file is derived as follows:

- **Spec files**: use the frontmatter `title` field. If absent, fall back to the humanised filename.
- **HTML files** (mockups, design library components and views): use the HTML `<title>` element. If absent, fall back to the humanised filename.

## Humanised filename fallback

When no explicit title is available, the filename is converted to a readable label:

- [ ] The file extension is stripped
- [ ] Hyphens and underscores are replaced with spaces
- [ ] The result is sentence-cased (first word capitalised, rest lowercase)
- [ ] Examples: `login-screen.html` → "Login screen", `patient-registration.html` → "Patient registration", `recurring-appointments.md` → "Recurring appointments"

## Information hierarchy

Files are always shown within their directory hierarchy. The treatment differs by surface:

### Files panel

- [ ] Specs and mockups are listed with their derived labels
- [ ] Items are grouped by type (specs, mockups) with section headers
- [ ] The list is flat within each group — no deep hierarchy (the files panel is narrow)
- [ ] Active file is visually highlighted when an artifact is open

### Spec explorer

- [ ] Specs are shown in an interactive expand/collapse tree
- [ ] Directory nodes (areas and subareas) use the same label derivation rule applied to the directory name
- [ ] Leaf nodes (individual specs) show the spec's derived label
- [ ] The full hierarchy is navigable

### Design library browser

- [ ] Components, views, and mockups are grouped and labelled using the same derivation rule
- [ ] Directory nodes use humanised directory names

## Chat notifications

When the AI creates or updates a spec or mockup during an interview:

- [ ] The notification card shows the file's derived label, not its filename or path
- [ ] For example: "Patient allergies updated" not "allergies.md updated"
- [ ] Mockup notifications show the mockup's title, not its filename

## Search

When the user searches in the file dropdown or spec explorer:

- [ ] Search matches against both the derived label and the underlying filename
- [ ] Both must be searched so users can find files by either the human-readable name or the slug they may have seen elsewhere
