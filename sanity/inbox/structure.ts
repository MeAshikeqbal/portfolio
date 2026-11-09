import type { StructureResolver } from "sanity/structure"

const list = (S: Parameters<StructureResolver>[0], title: string, filter: string) =>
  S.listItem()
    .title(title)
    .child(
      S.documentList()
        .title(title)
        .schemaType("message")
        .filter(filter)
        .defaultOrdering([{ field: "receivedAt", direction: "desc" }]),
    )

/** Inbox workspace: unread first, then read and archived. */
export const inboxStructure: StructureResolver = (S) =>
  S.list()
    .title("Inbox")
    .items([
      list(S, "Unread", `_type == "message" && status == "unread"`),
      list(S, "Read", `_type == "message" && status == "read"`),
      list(S, "Archived", `_type == "message" && status == "archived"`),
      S.divider(),
      list(S, "All messages", `_type == "message"`),
    ])
