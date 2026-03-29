---
title: Fast spec and design library loading
area: workflow
card: WH-030
status: draft
---

Loading specs (21 files) takes 8.4 seconds because each file is fetched sequentially from the GitHub API (~400ms per call). The design library has the same problem. Subsequent loads are equally slow because there is no caching.

## Parallel fetching

- [ ] Fetch all file contents with `Promise.all` instead of a sequential `for` loop
- [ ] Applies to both `fetchRepoSpecTree` and `fetchDesignLibrary`
- [ ] Expected improvement: ~8.4s → ~0.5s on first load (limited by single slowest request, not sum of all)

## Blob SHA caching

The recursive `getTree` response includes a `sha` for every blob. Two blobs with the same SHA have identical content — this is a git guarantee. Use an in-memory cache keyed by blob SHA to skip re-fetching unchanged files on subsequent loads.

- [ ] Cache decoded file content by blob SHA in a module-level `Map`
- [ ] On load, check cache before calling `getFileContent`
- [ ] Only fetch files whose SHA is not yet cached
- [ ] Expected improvement on subsequent loads: ~0.5s → ~50ms (just the tree call + cache lookups)

## Scope

This is a server-side change only. No UI or API contract changes — responses are identical, just faster.

## Open questions

> **Cache eviction:** The in-memory cache grows unboundedly. For now this is fine (21 files × ~4KB = ~84KB). If spec count grows significantly, add an LRU cap.
