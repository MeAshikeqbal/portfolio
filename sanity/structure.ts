import { orderableDocumentListDeskItem } from "@sanity/orderable-document-list"
import type { StructureResolver } from "sanity/structure"
import {
  AuthorIcon,
  BlogIcon,
  CategoryIcon,
  CvIcon,
  EducationIcon,
  ExperienceIcon,
  HomecaveIcon,
  NowIcon,
  PersonalIcon,
  PortfolioIcon,
  PostIcon,
  ProjectIcon,
  SkillIcon,
} from "./components/icons"

export const structure: StructureResolver = (S, context) =>
  S.list()
    .title("Content")
    .items([
      // Blog section
      S.listItem()
        .title("Blog")
        .icon(BlogIcon)
        .child(
          S.list()
            .title("Blog")
            .items([
              S.documentTypeListItem("post").title("Posts").icon(PostIcon),
              S.documentTypeListItem("category").title("Categories").icon(CategoryIcon),
              S.documentTypeListItem("author").title("Authors").icon(AuthorIcon),
            ]),
        ),

      // Portfolio section
      S.listItem()
        .title("Portfolio")
        .icon(PortfolioIcon)
        .child(
          S.list()
            .title("Portfolio")
            .items([
              // Drag to reorder: the site lists projects and skills in this order.
              orderableDocumentListDeskItem({
                type: "project",
                id: "project",
                title: "Projects",
                icon: ProjectIcon,
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: "skills",
                id: "skills",
                title: "Skills",
                icon: SkillIcon,
                S,
                context,
              }),
            ]),
        ),

      // Personal Info section
      S.listItem()
        .title("Personal Info")
        .icon(PersonalIcon)
        .child(
          S.list()
            .title("Personal Info")
            .items([
              S.documentTypeListItem("experiences").title("Work Experience").icon(ExperienceIcon),
              S.documentTypeListItem("education").title("Education").icon(EducationIcon),
              // CV as a singleton document
              S.listItem()
                .title("CV/Resume")
                .icon(CvIcon)
                .child(S.editor().id("cv").schemaType("cv").documentId("cv")),
              // Singletons behind /homecave (its copy: intro, node specs, setup) and /now
              S.listItem()
                .title("Homecave")
                .icon(HomecaveIcon)
                .child(S.editor().id("uses").schemaType("uses").documentId("uses")),
              S.listItem()
                .title("Now")
                .icon(NowIcon)
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
