import { createHash } from "node:crypto"

/** A messages file's nested JSON flattened to "namespace.key" → ICU string. */
export type Flat = Map<string, string>

type Tree = { [key: string]: string | Tree }

export function flatten(tree: Tree, prefix = "", out: Flat = new Map()): Flat {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === "string") out.set(path, value)
    else flatten(value, path, out)
  }
  return out
}

/** Nested JSON in `order`'s key order (the English file's), so diffs stay readable. */
export function unflatten(flat: Flat, order: Iterable<string>): Tree {
  const tree: Tree = {}
  for (const path of order) {
    const value = flat.get(path)
    if (value === undefined) continue
    const keys = path.split(".")
    let node = tree
    for (const key of keys.slice(0, -1)) node = (node[key] ??= {}) as Tree
    node[keys.at(-1)!] = value
  }
  return tree
}

/** Short content hash of an English message: the lock records which version was translated. */
export function hashMessage(message: string): string {
  return createHash("sha256").update(message).digest("hex").slice(0, 12)
}
