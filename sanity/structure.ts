import type { StructureResolver } from "sanity/structure"
import { FiFileText, FiUser, FiTag, FiBriefcase, FiBook, FiInfo, FiMail, FiCode, FiAward, FiFile } from "react-icons/fi"

export const structure: StructureResolver = (S) =>
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
              S.documentTypeListItem("project").title("Projects").icon(FiCode),
              S.documentTypeListItem("skills").title("Skills").icon(FiAward),
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
              S.documentTypeListItem("about").title("About Me").icon(FiInfo),
              S.documentTypeListItem("contact").title("Contact").icon(FiMail),
              S.documentTypeListItem("experiences").title("Work Experience").icon(FiBriefcase),
              S.documentTypeListItem("education").title("Education").icon(FiBook),
              // CV as a singleton document
              S.listItem()
                .title("CV/Resume")
                .icon(FiFile)
                .child(
                  S.editor()
                    .id("cv")
                    .schemaType("cv")
                    .documentId("cv")
                ),
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
            "skill",
            "about",
            "contact",
            "experiences",
            "education",
            "cv",
          ].includes(item.getId()!),
      ),
    ])
