---
title: Fast spec and design library loading
area: workflow
card: WH-030
status: complete
---

Loading specs (21 files) took 8.4 seconds because each file was fetched sequentially from the GitHub API (~400ms per round-trip). The design library had the same problem. Subsequent loads were equally slow because there was no caching.

## Root cause

Both `fetchRepoSpecTree` and `fetchDesignLibrary` used the GitHub REST API to read file contents — one HTTP request per file, awaited sequentially. Meanwhile, the server already has a local bare clone of every registered repo at `/data/repos/{owner}/{repo}/bare.git`.

## Fix: read from the local bare clone

- [x] Replace GitHub API calls with local `git ls-tree` + `git show` on the bare clone
- [x] Applies to both `fetchRepoSpecTree` and `fetchDesignLibrary`
- [x] No network calls at all — reads are purely local disk + git object lookups
- [x] Expected improvement: ~8.4s → <50ms (local git operations are sub-millisecond each)

## Scope

Server-side change only. No UI or API contract changes — responses are identical, just faster.
