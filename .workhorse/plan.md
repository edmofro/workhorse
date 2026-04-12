# WH-078 Implementation Plan

## Overview
Replace the standalone PrBar at the bottom of the chat area with:
1. A **From property** pill in the properties bar (after existing properties)
2. A **PR section** at the top of the artifacts sidebar (above Specs/Mockups/Code)

## Tasks

### Phase 1: PR Section in Artifacts Sidebar

- [x] **1.1 Create `PrSection` component** (`src/components/card/PrSection.tsx`)
  - Collapsed bar: PR icon + title + number + external-link icon (opens GitHub without expanding)
  - Click row to expand/collapse
  - States: hidden (no code changes), Create PR button, open PR, merged, merged+new, updating
  - Expanded detail: CI status row, auto-fix toggle, branch name (monospace + copy), local changes + commit action, unpushed + push action, remote status + pull action
  - "Prepare new PR" button for merged+new state
  - Uses existing `handleCreatePr` pattern from PrBar.tsx
  - Left-aligned Create PR button

- [x] **1.2 Add PrSection to ArtifactsSidebar**
  - Add `PrSection` above the three file sections
  - Pass through: `cardId`, `hasCodeChanges`, `prUrl`, `onPrCreated`
  - Hidden when `!hasCodeChanges && !prUrl`

- [x] **1.3 Remove PrBar from CardWorkspace**
  - Remove `<PrBar>` from the chat column (line ~655)
  - Remove PrBar import
  - Pass PR props to ArtifactsSidebar instead
  - Verify no layout shift (PrBar had a border placeholder)

### Phase 2: From Property in Properties Bar

- [x] **2.1 Add From property to CardProperties**
  - New pill after the existing dependsOn display
  - Shows "From main" or "From WH-058" based on card.dependsOn
  - Label "From" in muted text, value in primary text
  - Read-only for now (dropdown/rebase is future backend work)
  - Replace the existing monospace dependency labels with the From property

### Phase 3: Wire up props

- [x] **3.1 Thread PR props through ArtifactsSidebar**
  - Add `cardId`, `hasCodeChanges`, `prUrl`, `onPrCreated` to ArtifactsSidebarProps
  - All 3 ArtifactsSidebar call sites in CardWorkspace need updating (card-home, chat, skeleton already handled)

- [x] **3.2 Clean up**
  - Delete PrBar.tsx (no longer used)
  - Verify build passes

## Non-scope (backend work needed later)
- Branch details API (local changes, unpushed, remote status)
- Upstream update count API
- Auto-fix CI toggle persistence
- Conflict resolution subagent
- Squash-merge-then-fix cherry-pick
- Searchable From dropdown with rebase action
