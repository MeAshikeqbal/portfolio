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
  LabChangeIcon,
  NowIcon,
  PersonalIcon,
  PortfolioIcon,
  PostIcon,
  ProjectIcon,
  SkillIcon,
  TranslationIcon,
} from "./components/icons"
import { allLocales, localeInfo } from "../i18n/locales"

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
              S.documentTypeListItem("labChange").title("Lab changelog").icon(LabChangeIcon),
              S.listItem()
                .title("Now")
                .icon(NowIcon)
                .child(S.editor().id("now").schemaType("now").documentId("now")),
            ]),
        ),

      S.divider(),

      // Machine translations, written on publish (lib/translate). Listed per language so a
      // translation can be checked or corrected by hand; they're never created from here.
      S.listItem()
        .title("Translations")
        .icon(TranslationIcon)
        .child(
          S.list()
            .title("Translations")
            .items(
              allLocales
                .filter((locale) => locale !== "en")
                .map((locale) =>
                  S.listItem()
                    .id(`translations-${locale}`)
                    .title(localeInfo[locale].englishName)
                    .icon(TranslationIcon)
                    .child(
                      S.documentList()
                        .title(localeInfo[locale].englishName)
                        .schemaType("translation")
                        .filter('_type == "translation" && language == $locale')
                        .params({ locale })
                        .defaultOrdering([{ field: "translatedAt", direction: "desc" }])
                        .canHandleIntent(() => false),
                    ),
                ),
            ),
        ),

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
            "labChange",
            "now",
            "media.tag",
            "translation",
          ].includes(item.getId()!),
      ),
    ])
