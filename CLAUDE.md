@AGENTS.md

# Workhorse

Spec-driven development workbench. Building the machine that builds the machine.

## Tech stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL via Prisma ORM
- **AI:** Anthropic Claude API (@anthropic-ai/sdk)
- **Icons:** Lucide React
- **Utilities:** clsx, tailwind-merge

## Project structure

```
src/app/          — Next.js app router pages and API routes
src/components/   — React components
src/lib/          — Shared utilities, database client, AI client
prisma/           — Database schema and migrations
.workhorse/
  specs/          — Spec documents (flat, one file per spec)
  design/         — Design system docs and mockups
```

## Key concepts

- **Card:** A unit of work (like a Linear ticket) with acceptance criteria
- **Project:** A repo-backed workspace (e.g., Tamanu, Tupaia)
- **Spec interview:** AI-powered interview mode for developing acceptance criteria
- **Spec:** The acceptance criteria and requirements for a card
- **Team:** A group working on a repo (e.g., Tamanu team, Tupaia team)

## Design

Follow `.workhorse/design/design-system.md` strictly. Professional, refined aesthetic inspired by Linear and GitHub. Uses Inter font, 4px spacing grid, subtle hover states.

## Conventions

- Australian/NZ English spelling (colour, organisation, finalise)
- Card IDs: WH-XXX format
- Specs live in `.workhorse/specs/` directory in this repo
- Component files use PascalCase: `CardList.tsx`
- Utility files use camelCase: `prismaClient.ts`

## Pull requests

When creating a pull request, always use the template in `.github/pull_request_template.md` as the PR body. Fill in the Summary and Test plan sections, and keep the Review Hero checkboxes.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # ESLint
npx prisma db push  # Apply schema changes
npx prisma studio   # Database browser
```

## Review Hero

[Review Hero](https://github.com/beyondessential/review-hero) is the AI-powered PR review system used on this repo. It runs parallel Claude review agents on every PR and posts inline comments.

### How it works

1. When a PR is opened, tick the **Run Review Hero** checkbox in the PR description (the `<!-- #ai-review -->` marker triggers the workflow)
2. Review Hero triages the diff, runs specialised review agents (bugs, performance, design, security, plus custom agents), deduplicates findings, and posts inline comments
3. Optionally tick **Auto-fix review suggestions** (`<!-- #auto-fix -->`) or **Auto-fix CI failures** (`<!-- #auto-fix-ci -->`) to let it commit fixes directly

### Rules

- Always keep the Review Hero checkboxes in the PR template — do not remove them
- The PR template at `.github/pull_request_template.md` is the source of truth for the checkbox format
- Custom review agents live in `.github/review-hero/prompts/` as `.md` files — add domain-specific reviewers there
- Suppression rules for known false positives go in `.github/review-hero/suppressions.yml`
- Review Hero configuration is in `.github/review-hero/config.yml` — update the `ignore_patterns` when adding generated or non-reviewable paths
- If a reviewer reacts with 👎 to a Review Hero comment, it automatically learns to suppress similar findings in future
- Do not remove or modify the Review Hero workflow files (`.github/workflows/ai-review.yml`, `.github/workflows/ai-auto-fix.yml`) without understanding the implications

## Related projects

- **Tamanu** (beyondessential/tamanu) — Primary target repo, healthcare EMR
- **Tupaia** (beyondessential/tupaia) — Secondary target repo, data platform
- **McBean** — Felix's similar project in Rust/Leptos with Tracey format
- **Review Hero** — AI-powered PR review system (future integration)
- **Common Rules** (tupaia/llm/common-rules) — Shared AI agent rules
