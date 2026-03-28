@AGENTS.md

# Workhorse

Spec-driven development workbench. Building the machine that builds the machine.

## Tech stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** SQLite via Prisma ORM (may migrate to PostgreSQL later)
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
  specs/        — Feature specifications (the product backlog)
  design/         — Design system docs and mockups
```

## Key concepts

- **Feature:** A unit of work (like a Linear ticket) with acceptance criteria
- **Spec interview:** AI-powered interview mode for developing acceptance criteria
- **Spec:** The acceptance criteria and requirements for a feature
- **Team:** A group working on a repo (e.g., Tamanu team, Tupaia team)

## Design

Follow `.workhorse/design/design-system.md` strictly. Professional, refined aesthetic inspired by Linear and GitHub. Uses Inter font, 4px spacing grid, subtle hover states.

## Conventions

- Australian/NZ English spelling (colour, organisation, finalise)
- Feature IDs: WH-XXX format
- Specs live in `.workhorse/specs/` directory in this repo
- Component files use PascalCase: `FeatureList.tsx`
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

## Related projects

- **Tamanu** (beyondessential/tamanu) — Primary target repo, healthcare EMR
- **Tupaia** (beyondessential/tupaia) — Secondary target repo, data platform
- **McBean** — Felix's similar project in Rust/Leptos with Tracey format
- **Review Hero** — AI-powered PR review system (future integration)
- **Common Rules** (tupaia/llm/common-rules) — Shared AI agent rules
