import { revalidatePath } from "next/cache"

/**
 * Revalidates site pages in every language. Pages live under app/[lang], so a page is named by
 * its route pattern ("/post/[slug]"); one call covers /post/x, /hi/post/x, /ja/post/x…
 * Files outside the locale routing (rss.xml, sitemap.xml, resume.pdf) use revalidatePath.
 */
export function revalidatePages(...routes: string[]) {
  for (const route of routes) revalidatePath(`/[lang]${route === "/" ? "" : route}`, "page")
}
