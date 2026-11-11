import { CalloutIcon, CodeBlockIcon, ImageIcon } from "../components/icons"
import { defineArrayMember, defineField, defineType } from "sanity"

/**
 * Languages offered for code blocks. `value` is what's stored and what the site's Shiki
 * highlighter reads (lib/highlight.ts); `mode` picks the Studio editor's syntax mode.
 */
export const CODE_LANGUAGES = [
  { title: "TypeScript", value: "typescript" },
  { title: "TSX", value: "tsx" },
  { title: "JavaScript", value: "javascript" },
  { title: "JSX", value: "jsx" },
  { title: "Shell", value: "bash", mode: "sh" },
  { title: "JSON", value: "json" },
  { title: "YAML", value: "yaml" },
  { title: "HTML", value: "html" },
  { title: "CSS", value: "css" },
  { title: "Python", value: "python" },
  { title: "Go", value: "go", mode: "golang" },
  { title: "Rust", value: "rust" },
  { title: "SQL", value: "sql" },
  { title: "Dockerfile", value: "dockerfile", mode: "text" },
  { title: "Markdown", value: "markdown" },
  { title: "Plain text", value: "text" },
]

export const CALLOUT_TONES = [
  { title: "Note", value: "note" },
  { title: "Warning", value: "warning" },
] as const

/**
 * Rich text for blog posts, project case studies and /now. Rendered by
 * components/portable-text/components.tsx: anything added here needs a renderer there.
 */
export const blockContentType = defineType({
  title: "Block Content",
  name: "blockContent",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      // No H1: the page title is the only H1.
      styles: [
        { title: "Normal", value: "normal" },
        { title: "Heading 2", value: "h2" },
        { title: "Heading 3", value: "h3" },
        { title: "Heading 4", value: "h4" },
        { title: "Quote", value: "blockquote" },
      ],
      lists: [
        { title: "Bullet", value: "bullet" },
        { title: "Numbered", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Strong", value: "strong" },
          { title: "Emphasis", value: "em" },
          { title: "Code", value: "code" },
          { title: "Strike", value: "strike-through" },
        ],
        annotations: [
          defineField({
            title: "Link",
            name: "link",
            type: "object",
            fields: [
              defineField({
                title: "URL",
                name: "href",
                type: "url",
                description: "A full URL, a path on this site such as /projects, or mailto:.",
                validation: (rule) =>
                  rule.required().uri({ allowRelative: true, scheme: ["http", "https", "mailto"] }),
              }),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({
      type: "code",
      name: "code",
      title: "Code block",
      icon: CodeBlockIcon,
      options: {
        language: "typescript",
        languageAlternatives: CODE_LANGUAGES,
        withFilename: true,
      },
    }),
    defineArrayMember({
      type: "object",
      name: "callout",
      title: "Callout",
      icon: CalloutIcon,
      fields: [
        defineField({
          name: "tone",
          type: "string",
          options: { list: [...CALLOUT_TONES], layout: "radio", direction: "horizontal" },
          initialValue: "note",
          validation: (rule) => rule.required(),
        }),
        defineField({ name: "title", type: "string", description: "Optional." }),
        defineField({
          name: "text",
          type: "text",
          rows: 3,
          validation: (rule) => rule.required(),
        }),
      ],
      preview: {
        select: { tone: "tone", title: "title", text: "text" },
        prepare: ({ tone, title, text }) => ({
          title: title || text,
          subtitle: tone === "warning" ? "Warning" : "Note",
        }),
      },
    }),
    defineArrayMember({
      type: "image",
      icon: ImageIcon,
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Alternative text",
          description: "Describes the image for screen readers and when it fails to load.",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "caption",
          type: "string",
          description: "Optional, shown under the image.",
        }),
      ],
    }),
  ],
})
