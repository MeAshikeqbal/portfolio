import { type SchemaTypeDefinition } from "sanity"

import { blockContentType } from "./blockContentType"
import { categoryType } from "./categoryType"
import { postType } from "./postType"
import { authorType } from "./authorType"
import { experiencesType } from "./experiencesType"
import { educationType } from "./educationType"
import { skillType } from "./skillType"
import { projectType } from "./projectType"
import { cvType } from "./cvType"
import { seoType } from "./seoType"
import { usesType } from "./usesType"
import { nowType } from "./nowType"

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    blockContentType,
    categoryType,
    postType,
    authorType,
    experiencesType,
    educationType,
    projectType,
    skillType,
    cvType,
    seoType,
    usesType,
    nowType,
  ],
}
