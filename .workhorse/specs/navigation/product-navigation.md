---
title: Product navigation and onboarding
area: navigation
status: draft
---

Addresses gaps in sidebar navigation, product onboarding, and discoverability of core views (spec explorer, design browser).

## Sidebar navigation

- [ ] Each product in the sidebar expands to show sub-navigation links: Features (the current default), Specs, and Design
- [ ] Clicking a product name navigates to its feature list (current behaviour, unchanged)
- [ ] "Specs" links to `/:productSlug/specs` (the spec explorer)
- [ ] "Design" links to `/:productSlug/design` (the design browser)
- [ ] When multiple products exist, team groups are labelled with their parent product name (e.g. "Tamanu teams") to avoid ambiguity

## Empty product onboarding

- [ ] When a product has zero teams, the product page shows an empty state explaining that a team is needed before features can be created
- [ ] The empty state includes a prominent "Create team" action that either opens an inline form or links to settings with the product pre-selected
- [ ] The "New feature" button remains disabled when no teams exist (current behaviour), but the empty state makes the reason clear

## Product creation

- [ ] Creating a product in settings opens an inline form with empty fields rather than inserting a placeholder row with hardcoded values
- [ ] The GitHub URL field is required and validated (must match `github.com/:owner/:repo` pattern) before the product can be saved
- [ ] Owner and repo name are derived from the URL automatically (current behaviour, but only after a valid URL is entered)

## Open questions

> **Sidebar depth:** Should the specs/design sub-links always be visible, or collapse under a disclosure triangle per product?
