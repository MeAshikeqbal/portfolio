import { VideoIcon } from "../components/icons"
import { defineField, defineType } from "sanity"

import { VIDEO_MIME_TYPES, youtubeId } from "../../lib/video"
import { requiredAlt } from "./validation"

/**
 * A video: a short clip uploaded to Sanity (MP4/WebM, served from its CDN) or a YouTube link
 * (privacy-enhanced embed, loaded only when played). Used as a project's demo video and as a
 * block in case studies and posts.
 */
export const videoType = defineType({
  name: "video",
  title: "Video",
  type: "object",
  icon: VideoIcon,
  fields: [
    defineField({
      name: "kind",
      title: "Source",
      type: "string",
      options: {
        list: [
          { title: "Upload", value: "upload" },
          { title: "YouTube", value: "youtube" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "upload",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "file",
      title: "Video file",
      type: "file",
      description:
        "MP4 or WebM. Keep clips short and small (under about 20 MB): every view is served from Sanity's CDN.",
      options: { accept: VIDEO_MIME_TYPES.join(",") },
      hidden: ({ parent }) => parent?.kind === "youtube",
      validation: (rule) =>
        rule.custom((value, { parent }) =>
          (parent as { kind?: string })?.kind !== "youtube" && !value?.asset
            ? "Upload a video file."
            : true,
        ),
    }),
    defineField({
      name: "youtubeUrl",
      title: "YouTube URL",
      type: "url",
      description: "Any YouTube link (watch, youtu.be or Shorts). A ?t= start time is kept.",
      hidden: ({ parent }) => parent?.kind !== "youtube",
      validation: (rule) =>
        rule.custom((value, { parent }) => {
          if ((parent as { kind?: string })?.kind !== "youtube") return true
          if (!value) return "Paste a YouTube link."
          return youtubeId(value) ? true : "That doesn't look like a YouTube video link."
        }),
    }),
    defineField({
      name: "title",
      type: "string",
      description: "What the video shows. Read by screen readers and used as the player's name.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "caption",
      type: "string",
      description: "Optional, shown under the video.",
    }),
    defineField({
      name: "loop",
      title: "Play like a GIF",
      type: "boolean",
      description:
        "Muted, looping, no controls: for short silent demos. Doesn't autoplay for visitors who prefer reduced motion.",
      initialValue: false,
      hidden: ({ parent }) => parent?.kind === "youtube",
    }),
    defineField({
      name: "poster",
      title: "Poster image",
      type: "image",
      description:
        "Optional. Shown before the video plays (YouTube videos use their own thumbnail otherwise).",
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Alternative text",
          validation: requiredAlt,
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      kind: "kind",
      youtubeUrl: "youtubeUrl",
      loop: "loop",
      media: "poster",
    },
    prepare: ({ title, kind, youtubeUrl, loop, media }) => ({
      title: title || "Untitled video",
      subtitle:
        kind === "youtube"
          ? `YouTube${youtubeUrl ? ` · ${youtubeId(youtubeUrl) ?? "invalid link"}` : ""}`
          : loop
            ? "Upload · plays like a GIF"
            : "Upload",
      media: media ?? VideoIcon,
    }),
  },
})
