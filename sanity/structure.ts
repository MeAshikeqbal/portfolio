import { orderableDocumentListDeskItem } from "@sanity/orderable-document-list"
import type { StructureResolver } from "sanity/structure"
import {
  FiFileText,
  FiUser,
  FiTag,
  FiBriefcase,
  FiBook,
  FiInfo,
  FiCode,
  FiAward,
  FiFile,
  FiMonitor,
  FiClock,
} from "react-icons/fi"

export const structure: StructureResolver = (S, context) =>
  S.list()
    .title("Content")
    .items([
      // Blog section
      S.listItem()
        .title("Blog")
        .icon(FiFileText)
        .child(
          S.list()
            .title("Blog")
            .items([
              S.documentTypeListItem("post").title("Posts").icon(FiFileText),
              S.documentTypeListItem("category").title("Categories").icon(FiTag),
              S.documentTypeListItem("author").title("Authors").icon(FiUser),
            ]),
        ),

      // Portfolio section
      S.listItem()
        .title("Portfolio")
        .icon(FiBriefcase)
        .child(
          S.list()
            .title("Portfolio")
            .items([
              // Drag to reorder: the site lists projects and skills in this order.
              orderableDocumentListDeskItem({
                type: "project",
                id: "project",
                title: "Projects",
                icon: FiCode,
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: "skills",
                id: "skills",
                title: "Skills",
                icon: FiAward,
                S,
                context,
              }),
            ]),
        ),

      // Personal Info section
      S.listItem()
        .title("Personal Info")
        .icon(FiInfo)
        .child(
          S.list()
            .title("Personal Info")
            .items([
              S.documentTypeListItem("experiences").title("Work Experience").icon(FiBriefcase),
              S.documentTypeListItem("education").title("Education").icon(FiBook),
              // CV as a singleton document
              S.listItem()
                .title("CV/Resume")
                .icon(FiFile)
                .child(S.editor().id("cv").schemaType("cv").documentId("cv")),
              // Singletons behind /uses and /now
              S.listItem()
                .title("Uses")
                .icon(FiMonitor)
                .child(S.editor().id("uses").schemaType("uses").documentId("uses")),
              S.listItem()
                .title("Now")
                .icon(FiClock)
                .child(S.editor().id("now").schemaType("now").documentId("now")),
            ]),
        ),

      S.divider(),

      // Singleton documents and other types - exclude cv from the filter
      ...S.documentTypeListItems().filter(
        (item) =>
          item.getId() &&
          ![
            "post",
            "category",
            "author",
            "project",
            "skills",
            "experiences",
            "education",
            "cv",
            "uses",
            "now",
            "media.tag",
          ].includes(item.getId()!),
      ),
    ])
