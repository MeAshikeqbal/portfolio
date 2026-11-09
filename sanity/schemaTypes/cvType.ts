import { FileText } from "lucide-react"
import { defineField, defineType } from "sanity"

/** Singleton: the résumé PDF served at /resume.pdf. */
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
      description: "PDF, served at itsashik.dev/resume.pdf.",
      options: { accept: ".pdf" },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { filename: "cvFile.asset.originalFilename", updatedAt: "_updatedAt" },
    prepare: ({ filename, updatedAt }) => ({
      title: "Résumé",
      subtitle: [
        filename ?? "No file",
        updatedAt
          ? `updated ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(updatedAt))}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }),
  },
})
