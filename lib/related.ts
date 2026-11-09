/**
 * Ranks "related" posts by the topics they share with the current one, weighting each shared
 * topic by how rare it is: sharing "Homelab" (2 posts) says far more than sharing
 * "Technology" (10). Ties go to the newer post. Inverse document frequency, in short.
 */
export function rankRelated<
  T extends { categoryIds?: string[] | null; publishedAt?: string | null },
>(
  candidates: T[],
  categories: { _id: string; posts?: number | null }[] | null | undefined,
  limit = 3,
): T[] {
  const weight = new Map(
    (categories ?? []).map((c) => [c._id, 1 / Math.log2(1 + Math.max(1, c.posts ?? 1))]),
  )
  const score = (post: T) =>
    (post.categoryIds ?? []).reduce((sum, id) => sum + (weight.get(id) ?? 0), 0)

  return candidates
    .map((post) => ({ post, score: score(post) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || (b.post.publishedAt ?? "").localeCompare(a.post.publishedAt ?? ""),
    )
    .slice(0, limit)
    .map((entry) => entry.post)
}
