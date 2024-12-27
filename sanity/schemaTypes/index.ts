import { type SchemaTypeDefinition } from "sanity";

import { blockContentType } from "./blockContentType";
import { categoryType } from "./categoryType";
import { postType } from "./postType";
import { authorType } from "./authorType";
import { aboutType } from "./aboutType";
import { contactType } from "./contactType";
import { experiencesType } from "./experiencesType";
import { educationType } from "./educationType";
import { skillType } from "./skillType";
import { projectType } from "./projectType";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    blockContentType,
    categoryType,
    postType,
    authorType,
    aboutType,
    contactType,
    experiencesType,
    educationType,
    projectType,
    skillType,
  ],
};
