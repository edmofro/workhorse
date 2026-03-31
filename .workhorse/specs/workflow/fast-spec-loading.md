---
title: Fast spec and design library loading
area: workflow
card: WH-030
---

Loading specs (21 files) took 8.4 seconds because each file was fetched sequentially from the GitHub API (~400ms per round-trip). The design library had the same problem. Subsequent loads were equally slow because there was no caching.

## Root cause

Both `fetchRepoSpecTree` and `fetchDesignLibrary` used the GitHub REST API to read file contents — one HTTP request per file, awaited sequentially. Local bare clones at `/data/repos/{owner}/{repo}/bare.git` are much faster.

## Fix: read from the local bare clone

- [x] Replace GitHub API calls with local `git ls-tree` + `git show` on the bare clone
- [x] Applies to both `fetchRepoSpecTree` and `fetchDesignLibrary`
- [x] Expected improvement: ~8.4s → <50ms (local git operations are sub-millisecond each)

## Bare clone lifecycle

The bare clone may not exist on first visit (it was previously only created when starting an agent session). All bare clone readers now go through `ensureBareClone()` in `worktree.ts`, which:

1. **Creates on demand** — if the bare clone doesn't exist, clones it using the user's OAuth token
2. **Fetches with throttling** — refreshes refs at most once per 30 seconds per repo, so page loads stay fast while data stays reasonably current
3. **Single entry point** — all consumers (spec tree, design library, agent session, worktree recovery) call `ensureBareClone()` rather than managing clone/fetch independently

## Scope

Server-side change only. No UI or API contract changes — responses are identical, just faster.
