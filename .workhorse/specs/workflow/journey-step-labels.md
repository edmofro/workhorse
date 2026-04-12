---
title: Journey step labels
area: workflow
card: WH-075
---

Journal entries carry a short, stable label used as the display text throughout the journey section. The label is determined once when the entry is created and stored alongside the entry, so every rendering of the journey is consistent.

## Journal entry labels

- [ ] Each journal entry has a `label` field: a short human-readable name for the step (e.g. "Interview", "Design audit", "Spec review")
- [ ] The label is 1–3 words, matching the style of pill labels and skill names
- [ ] The jockey sets the label when it creates a journal entry — the label is persisted and never re-derived on display
- [ ] For entries that map to a built-in skill, the label matches the skill's display name (e.g. the `interview` skill produces entries labelled "Interview")
- [ ] For entries that don't map directly to a skill (e.g. a status change or external event), the jockey chooses a concise label that describes the event

## Journey section display

- [ ] The expanded journey dropdown shows each completed entry's label as the primary text, with the timestamp on the right
- [ ] The full summary is not shown in the journey dropdown — the label is sufficient
- [ ] The collapsed journey bar shows the active step's label beside the progress dots (unchanged from current behaviour)

## Jockey output

- [ ] The jockey's journal entry output includes a `label` field alongside `type` and `summary`
- [ ] The jockey prompt instructs: labels are 1–3 words, matching skill display names where applicable
- [ ] The `summary` field is retained for use in contexts that benefit from more detail (e.g. the handoff prompt, PR descriptions) but is not shown in the journey UI

## Data model

- [ ] The journal entry stores `label` as a required field
- [ ] Existing entries without a label fall back to deriving one from the entry's `type` field via the skill registry (same logic the collapsed bar uses today)
