# Workhorse

Spec-driven development workbench. Building the machine that builds the machine.

Workhorse helps product owners, testers, and developers collaboratively develop rigorous feature specifications through AI-assisted interviews, structured editing, and seamless codebase integration. Think of it as the tool that ensures nothing gets missed before a line of code is written.

## What it does

- **AI-powered spec interviews** — a structured conversation that probes for edge cases, identifies interactions with existing functionality, and drafts acceptance criteria. The AI has remote access to the target codebase.
- **Rich spec editing** — product owners work with a clean editor, not raw markdown. Specs are collaboratively editable.
- **Visual mockups** — the AI generates HTML/CSS mockups inline during conversations to illustrate concepts and clarify questions.
- **Commit to codebase** — specs are committed as structured markdown to the product's repository. Workhorse handles branches and PRs invisibly.
- **Spec explorer** — a navigable knowledge base of merged specs per product, built from the main branch.
- **Design library** — per-product design system docs, reusable components, and committed mockups in `.workhorse/design/`.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) with TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL via Prisma ORM |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Icons | Lucide React |
| Utilities | clsx, tailwind-merge |

## Getting started

1. Copy `.env.example` to `.env` and fill in the values (see [Environment variables](#environment-variables))
2. Set up a PostgreSQL database and add the connection string to `DATABASE_URL`
3. Create a [GitHub OAuth app](https://github.com/settings/developers) with callback URL `http://localhost:3000/api/auth/github/callback`

```bash
npm install
npx prisma db push    # Apply schema to your database
npm run dev           # Start the dev server at http://localhost:3000
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgresql://user:pass@host:5432/workhorse`) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for AI chat and review features |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth app client secret |
| `NEXTAUTH_URL` | Yes | Base URL of the application (e.g. `https://yourdomain.com`) |
| `REPOS_BASE_PATH` | No | Path for git repository storage (default: `/data/repos`) |
| `CLAUDE_CONFIG_DIR` | No | Path for Claude Agent SDK session storage (default: `/data/repos/.claude`) |
| `GITHUB_SERVICE_TOKEN` | No | GitHub token for automatic worktree recovery on restart |

## Deploying on Railway

Railway is a good fit because it supports persistent volumes (needed for git worktree storage) and managed PostgreSQL.

### 1. Create the project

- Create a new project on [Railway](https://railway.com)
- Add a **PostgreSQL** service from the Railway dashboard
- Add a **New Service → GitHub Repo** and connect your fork of this repo

### 2. Configure environment variables

In the service settings, add:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=...
NEXTAUTH_URL=https://your-app.up.railway.app
```

Use Railway's variable reference (`${{Postgres.DATABASE_URL}}`) to automatically inject the database URL from the PostgreSQL service.

### 3. Attach a persistent volume

The app stores git bare clones, worktrees, and Claude Agent SDK sessions on disk. Without a volume, these are lost on each deploy (stale session IDs will cause errors when resuming conversations).

- Go to your service → **Settings → Volumes**
- Add a volume mounted at `/data/repos`
- This matches the default `REPOS_BASE_PATH`; if you use a different mount path, set `REPOS_BASE_PATH` accordingly
- Claude SDK sessions are stored at `$REPOS_BASE_PATH/.claude` by default (override with `CLAUDE_CONFIG_DIR`)

### 4. Build and deploy settings

Railway auto-detects Node.js. The defaults should work, but verify:

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Start command | `npm start` |
| Watch paths | `/` (default) |

The build command runs `prisma generate && next build` automatically.

After the first deploy, apply the database schema:

```bash
railway run npx prisma db push
```

Or enable auto-migration by adding a release command in Railway:

```
npx prisma db push
```

### 5. Set up GitHub OAuth callback

Update your GitHub OAuth app's callback URL to:

```
https://your-app.up.railway.app/api/auth/github/callback
```

### 6. Verify

Visit your Railway URL. You should see the sign-in page. Authenticate with GitHub and you're running.

## Project structure

```
src/
  app/              — Next.js app router pages and API routes
  components/       — React components (PascalCase)
  lib/              — Shared utilities, database client, AI client (camelCase)
prisma/             — Database schema and migrations
.workhorse/
  specs/            — Feature specifications (the product backlog)
  design/           — Design system docs, mockups
```

## `.workhorse/` directory

Workhorse dogfoods itself. The `.workhorse/` directory contains its own specs and design assets in the same format it manages for other products:

```
.workhorse/
├── specs/
│   ├── overview.md                         — v1 scope, flow, and key decisions
│   ├── interview/
│   │   └── speculate.md                    — WH-001: AI-driven spec interview
│   ├── editor/
│   │   └── spec-editor.md                  — WH-002: Rich spec editor
│   ├── mockups/
│   │   └── visual-mockups.md               — WH-003: AI-generated mockups
│   ├── workflow/
│   │   ├── commit-specs.md                 — WH-005: Committing specs to codebase
│   │   └── spec-format.md                  — WH-006: Spec format and IA
│   ├── navigation/
│   │   ├── teams-features.md               — WH-007: Teams and feature list
│   │   └── spec-explorer.md                — WH-017: Product spec explorer
│   ├── identity/
│   │   └── user-identity.md                — WH-008: User identity
│   ├── products/
│   │   └── multi-product.md                — WH-010: Multi-product support
│   ├── integrations/
│   │   └── github.md                       — WH-013: GitHub integration
│   ├── cards/
│   │   ├── card-tab.md                     — WH-016: Feature card (Card tab)
│   │   ├── multi-spec.md                   — WH-018: Multi-spec cards
│   │   └── dependencies.md                 — WH-019: Card dependencies
│   └── design-library/
│       └── design-library.md               — WH-020: Design library
├── design/
│   ├── design-system.md                    — Complete design system reference
│   └── mockups/
│       ├── spec-review.html                — Spec browser document view
│       ├── feature-card-views.html         — Cards list, chat, and spec views
│       └── mockup-viewer.html              — Full-screen mockup viewer
```

### Spec format

Each spec is a markdown file with YAML frontmatter:

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

See [`.workhorse/specs/spec-format.md`](.workhorse/specs/spec-format.md) for the full specification.

## Commands

```bash
npm run dev           # Start development server
npm run build         # Production build
npm run lint          # ESLint
npx prisma db push   # Apply schema changes
npx prisma studio    # Database browser
```

## Conventions

- Australian/NZ English spelling (colour, organisation, finalise)
- Feature IDs use `WH-XXX` format
- Component files use PascalCase: `FeatureList.tsx`
- Utility files use camelCase: `prismaClient.ts`

## Design

The design system is documented in [`.workhorse/design/design-system.md`](.workhorse/design/design-system.md). Warm neutral palette, burnt orange accent (`#c2410c`), Inter font, 4px spacing grid. Professional and refined, in the lineage of Linear, GitHub, and Raycast.

## Related projects

- **Tamanu** ([beyondessential/tamanu](https://github.com/beyondessential/tamanu)) — Primary target repo, healthcare EMR
- **Tupaia** ([beyondessential/tupaia](https://github.com/beyondessential/tupaia)) — Secondary target repo, data platform
- **McBean** — Similar project in Rust/Leptos with Tracey format
- **Review Hero** — AI-powered PR review system (future integration)
