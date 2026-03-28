# Workhorse v1 Implementation Plan

## Progress

- [x] **Phase 0: Foundation** — Design system, core components, Prisma client
- [x] **Phase 1: User Identity & App Shell** — WH-008, WH-010, WH-007 partial
- [x] **Phase 2: Feature Cards & Home View** — WH-007, WH-016
- [x] **Phase 3: AI Chat Interview** — WH-001 core
- [x] **Phase 4: Spec Editor & Format** — WH-002, WH-006, WH-018
- [x] **Phase 5: Visual Mockups** — WH-003
- [x] **Phase 6: Fresh-Eyes Review & Completeness** — WH-001 advanced
- [x] **Phase 7: Commit Specs & Handoff** — WH-005
- [x] **Phase 8: Card Dependencies** — WH-019
- [x] **Phase 9: Product Spec Explorer** — WH-017
- [x] **Phase 10: Design Library** — WH-020 partial
- [x] **Phase 11: Polish & GitHub Integration** — WH-013 partial

## Spec dependency map

```
WH-008 (User Identity)         — foundational, no deps
WH-010 (Products)              — foundational, no deps
WH-007 (Teams & Features)      — depends on WH-008, WH-010
WH-016 (Feature Card tab)      — depends on WH-007
WH-006 (Spec Format)           — standalone format definition
WH-001 (AI Interview/Chat)     — depends on WH-007, WH-016, WH-006
WH-002 (Spec Editor)           — depends on WH-006, WH-001
WH-018 (Multi-spec Cards)      — depends on WH-002, WH-001, WH-006
WH-003 (Visual Mockups)        — depends on WH-001 (chat), WH-018
WH-005 (Commit Specs)          — depends on WH-018, WH-002
WH-019 (Card Dependencies)     — depends on WH-007, WH-005
WH-017 (Spec Explorer)         — depends on WH-006, WH-010
WH-020 (Design Library)        — depends on WH-010, WH-017
WH-013 (GitHub Integration)    — future/stretch, depends on WH-005
```

## Key architectural decisions

- **Route structure:** Route groups `(main)` share sidebar layout. Feature detail uses nested layout with view toggle. Tabs (Card/Chat/Spec) are separate pages.
- **Server Actions vs Route Handlers:** Server Actions for CRUD mutations. Route Handlers for streaming chat and webhooks.
- **Streaming chat:** `/api/chat/route.ts` returns a ReadableStream piping Anthropic's streaming response.
- **State management:** No external state library. Server components for data loading, `useOptimistic` for optimistic updates, minimal client state via `useState`/`useContext`.
- **Auto-save:** Spec editor debounces changes (500ms) and calls a server action. No manual save.
- **Next.js 16:** `params` and `searchParams` are Promises — must be awaited. Use `PageProps<'/path'>` type helpers.
- **No real-time collab in v1:** Multiple users can edit (last write wins with auto-save), changes visible on refresh.

## Important references

- **Design mockups:** `design-mockups/option-b6.html` (main UI), `option-b9-mockup-view.html` (mockup viewer)
- **Design guide:** `docs/DESIGN-GUIDE.md` — exact CSS tokens, typography, spacing, component specs
- **Specs:** `specs/` directory — all v1 feature specs with acceptance criteria

---

## Phase 0: Foundation (DONE)

- Applied Prisma schema, generated client with v7 adapter
- Created `src/lib/prisma.ts`, `src/lib/cn.ts`, `src/lib/anthropic.ts`
- Replaced `globals.css` with full design system (all tokens from DESIGN-GUIDE.md)
- Replaced `layout.tsx` with Inter font, Workhorse metadata
- Built core components: `Button`, `Avatar`, `Tag`, `StatusDot`, `ViewToggle`
- Cleaned up superseded mockups
- Build + lint pass

## Phase 1: User Identity & App Shell

### WH-008: User Identity
- Create `src/lib/actions/user.ts` — server actions: createUser, getUser, updateUser
- Create `src/components/UserSetup.tsx` — modal prompting for display name on first visit
- Create `src/lib/hooks/useCurrentUser.ts` — reads userId from localStorage, fetches user data
- Create `src/components/UserProvider.tsx` — context provider, shows UserSetup if no user
- Store userId in cookie so server components can access it

### App Shell (WH-007, WH-010 partial)
- Create `src/components/Sidebar.tsx` — logo, product list, user footer (match option-b6.html exactly)
- Create `src/components/Topbar.tsx` — context-aware: page title for lists, feature title + view toggle for features
- Create `src/app/(main)/layout.tsx` — sidebar + main content
- Create `src/lib/actions/products.ts` — CRUD for products
- Create `src/lib/actions/teams.ts` — CRUD for teams
- Create settings page for product/team management

## Phase 2: Feature Cards & Home View

### Feature List (WH-007)
- Create `src/lib/actions/features.ts` — CRUD, auto-generate WH-XXX identifiers
- Create `src/app/(main)/[productSlug]/page.tsx` — product home, features grouped by status
- Create `src/components/FeatureList.tsx` — three groups with status dots, headers, counts
- Create `src/components/FeatureCard.tsx` — card per design guide
- Create `src/components/CreateFeatureDialog.tsx` — new feature modal

### Feature Detail — Card Tab (WH-016)
- Create `src/app/(main)/[productSlug]/features/[featureId]/layout.tsx` — view toggle layout
- Create `src/app/(main)/[productSlug]/features/[featureId]/page.tsx` — card tab
- Create `src/components/feature/CardTab.tsx` — description, metadata, comments
- Create `src/components/feature/MetadataPanel.tsx` — inline-editable status, priority, team, assignee
- Create `src/components/feature/Comments.tsx` — comment list + input

## Phase 3: AI Chat Interview (WH-001 core)

### Chat Infrastructure
- Create `src/app/api/chat/route.ts` — streaming POST handler using Anthropic SDK
- Create `src/lib/ai/systemPrompt.ts` — builds system prompt (role, card description, interview methodology)
- Create `src/lib/ai/streamChat.ts` — wrapper around anthropic.messages.stream()

### Chat UI
- Create `src/app/(main)/[productSlug]/features/[featureId]/chat/page.tsx`
- Create `src/components/feature/ChatView.tsx` — scrollable messages, max-width 680px
- Create `src/components/feature/ChatMessage.tsx` — AI/user message display with markdown
- Create `src/components/feature/ChatInput.tsx` — textarea with send button, auto-resize
- Create `src/lib/hooks/useChat.ts` — manages chat state, streaming

### Spec Extraction
- Create `src/lib/ai/specExtraction.ts` — parse AI responses for spec content

## Phase 4: Spec Editor & Format (WH-002, WH-006, WH-018)

### Spec Utilities
- Create `src/lib/specs/format.ts` — parse/serialize YAML frontmatter + markdown
- Create `src/lib/specs/specTree.ts` — path utilities, hierarchy builder

### Spec Tab
- Create `src/app/(main)/[productSlug]/features/[featureId]/spec/page.tsx`
- Create `src/components/feature/SpecTab.tsx` — spec list sidebar + editor
- Create `src/components/feature/SpecEditor.tsx` — markdown editor with auto-save
- Create `src/lib/actions/specs.ts` — CRUD for FeatureSpec
- Create `src/components/feature/ChatSidebar.tsx` — narrow 320px chat alongside spec editor

## Phase 5: Visual Mockups (WH-003)

- Create `src/lib/ai/mockupDetection.ts` — detect mockup blocks in AI responses
- Create `src/lib/actions/mockups.ts` — CRUD for Mockup
- Create `src/components/feature/MockupPreview.tsx` — compact inline preview
- Create `src/components/feature/MockupsPanel.tsx` — persistent panel listing all mockups
- Create `src/components/feature/MockupViewer.tsx` — full-screen with device toggle, floating chat
- Update system prompt to include mockup generation instructions

## Phase 6: Fresh-Eyes Review (WH-001 advanced)

- Create `src/lib/ai/freshEyesReview.ts` — independent review agent (spec + codebase only, no chat history)
- Create `src/app/api/review/route.ts` — trigger review pass
- Create `src/components/feature/ReviewFindings.tsx` — display findings, accept/reject/refine
- Create `src/lib/ai/completenessCheck.ts` — coverage tracking across areas
- Create `src/components/feature/CompletenessIndicator.tsx` — coverage display

## Phase 7: Commit Specs & Handoff (WH-005)

- Create `src/lib/git/githubClient.ts` — GitHub API wrapper (branches, commits, PRs)
- Create `src/lib/git/branchNaming.ts` — deterministic branch names from card ID
- Create `src/lib/git/commitSpecs.ts` — orchestrate commit flow
- Create `src/components/feature/CommitButton.tsx` — in topbar, shows PR link after commit
- Create `src/lib/handoff/generatePrompt.ts` — downloadable implementation prompt

## Phase 8: Card Dependencies (WH-019)

- Create `src/lib/actions/dependencies.ts` — add/remove deps, cycle detection
- Create `src/components/feature/DependencyPicker.tsx` — search/select cards
- Update MetadataPanel with "depends on" section
- Update system prompt to include parent card specs
- Update commit flow to branch off parent branches

## Phase 9: Product Spec Explorer (WH-017)

- Create `src/lib/git/specTree.ts` — fetch .workhorse/specs/ from main branch via GitHub API
- Create `src/app/(main)/[productSlug]/specs/page.tsx` — explorer with tree + content
- Create `src/components/specs/SpecTree.tsx` — collapsible folder tree
- Create `src/components/specs/SpecDocument.tsx` — rendered spec with card link-back

## Phase 10: Design Library (WH-020 partial)

- Create `src/lib/git/designLibrary.ts` — fetch .workhorse/design/ from main
- Create `src/app/(main)/[productSlug]/design/page.tsx` — browse docs, components, views, mockups
- Create `src/components/design/DesignBrowser.tsx` — navigation
- Create `src/components/design/DesignPreview.tsx` — HTML in iframe, markdown rendering

## Phase 11: Polish & GitHub Integration (WH-013 partial)

- Add filtering to FeatureList (status, team, assignee)
- Create ActivityFeed component for card tab
- Create GitHub webhook handler for PR merge events
- Error handling and loading states throughout

## Parallelisation notes

- Phases 5 and 6 can run in parallel (mockups + review are independent)
- Phases 8 and 9 can run in parallel (dependencies + spec explorer are independent)
- Phases 10 and 11 can run in parallel (design library + polish are independent)
