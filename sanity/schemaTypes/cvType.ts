import { FileText } from "lucide-react";
import { defineField, defineType } from "sanity";

export const cvType = defineType({
  name: "cv",
  title: "CV",
  type: "document",
  icon: FileText,
  fields: [
    defineField({
      name: "cvFile",
      title: "Latest CV",
      type: "file",
      options: {
        accept: ".pdf",
      },
    }),
  ],
});
