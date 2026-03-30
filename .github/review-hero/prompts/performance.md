# Agent: Performance & Responsiveness

Check that changes maintain a snappy, responsive user experience. Workhorse should feel as fast as Linear — no perceptible lag on interactions.

Read `.workhorse/design/design-system.md` (the "Responsiveness & perceived performance" section) for the full design principles.

## Key rules

- **No waterfall queries.** Independent data fetches must use `Promise.all`, not sequential `await`. Server-side pages and API routes that fetch multiple pieces of data should parallelise them.
- **No missing loading states.** Every page that fetches data must show skeleton UI or a loading state instantly. Client components using react-query must handle `isLoading`. Never show a blank screen while data loads.
- **No full-table scans.** Any new Prisma model field used as a foreign key or frequently queried with `where` must have an `@@index`. Check `prisma/schema.prisma` for missing indexes on new columns.
- **No blocking layout renders.** Expensive operations (GitHub API calls, git operations) must not block the main layout from rendering. Use caching or move to client-side fetching.
- **No redundant queries.** Don't fetch the same data multiple times in a single page load. Use react-query's cache deduplication — components sharing the same `queryKey` will share the same request.
- **No N+1 patterns.** When loading related data (e.g. cards with assignees), use Prisma `include` or `select` to batch the query, not individual lookups per item.
- **Select only what you need.** When querying related models, use `select` to fetch only the fields consumed downstream. Don't load full records when you only need `id` and `title`.
- **Optimistic updates for user actions.** Mutations that change visible state (status changes, comments, tags) should update the UI immediately, not wait for the server response.

## What to ignore

- Streaming performance (agent chat SSE) — latency there is inherent to AI generation
- Build time optimisation
- Bundle size (unless egregiously large imports)
