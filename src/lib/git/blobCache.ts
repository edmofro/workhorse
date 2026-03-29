/**
 * In-memory cache for git blob content, keyed by blob SHA.
 * Two blobs with the same SHA are guaranteed identical by git,
 * so cached content never goes stale — it can only become unused.
 */
export const blobCache = new Map<string, string>()
