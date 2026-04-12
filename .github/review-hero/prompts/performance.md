# Agent: Frontend Snappiness

Workhorse must feel as fast as Linear. Check that changes maintain a snappy, responsive user experience with intelligent caching and no perceptible lag on interactions.

Read `.workhorse/design/design-system.md` (the "Responsiveness & perceived performance" section) for the full design principles.

## Client-side caching & data fetching

- **Use react-query for all client-side data fetching.** Raw `useEffect` + `fetch` patterns bypass the cache. All GET requests from client components should go through `useQuery` with an appropriate `queryKey` and `staleTime`.
- **Choose appropriate stale times.** Frequently-changing data (cards, sessions) should have short stale times (10–30s). Rarely-changing data (project info, repo list) can have longer stale times (1–5 min).
- **Deduplicate with shared query keys.** If two components need the same data, they should use the same `queryKey` so react-query deduplicates the request. Don't create separate API calls for the same data.
- **Don't refetch what you already have.** When navigating back to a previously-visited page, react-query should serve cached data instantly. If a component clears and re-fetches data on every mount, that's a bug.
- **Optimistic updates for user actions.** Mutations that change visible state (status changes, comments, tags) should update the UI immediately via `queryClient.setQueryData` or `onMutate`, not wait for the server response.
- **Invalidate caches after mutations.** After a successful mutation (e.g. creating a card), invalidate the relevant query keys so stale data is refreshed.

## Server-side query performance

- **No waterfall queries.** Independent data fetches in API routes must use `Promise.all`, not sequential `await`.
- **No full-table scans.** Any new Prisma model field used as a foreign key or in a `where` clause must have an `@@index` in `prisma/schema.prisma`.
- **No N+1 patterns.** When loading related data, use Prisma `include` or `select` to batch the query.
- **Select only what you need.** Use `select` to fetch only consumed fields. Don't load full records when you only need `id` and `title`.

## Loading states & perceived performance

- **Every data-dependent view needs a skeleton.** Client components using `useQuery` must render meaningful skeleton UI during `isLoading`. Never show a blank screen.
- **Skeletons must match the real layout.** A skeleton that doesn't match the final content causes layout shift, which feels worse than a spinner.
- **No blocking layout renders.** Expensive operations (GitHub API calls, git operations) must not block the sidebar or topbar from rendering.

## What to ignore

- Streaming performance (agent chat SSE) — latency there is inherent to AI generation
- Build time optimisation
- Bundle size (unless egregiously large imports)
