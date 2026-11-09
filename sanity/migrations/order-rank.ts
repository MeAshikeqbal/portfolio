import { LexoRank } from "lexorank"

/**
 * `count` ascending LexoRank strings, spaced the way @sanity/orderable-document-list's own
 * "reset order" spaces them, so drag-and-drop has room between neighbours.
 */
export function rankSequence(count: number): string[] {
  const ranks: string[] = []
  let rank = LexoRank.min()
  for (let i = 0; i < count; i++) {
    rank = rank.genNext().genNext()
    ranks.push(rank.toString())
  }
  return ranks
}
