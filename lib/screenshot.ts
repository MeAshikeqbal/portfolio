/** Viewport the target page is rendered at before cropping and scaling. */
const VIEWPORT_WIDTH = 1280

/**
 * thum.io screenshot of a page's first screen, cropped to `width`×`height`'s aspect ratio and
 * rendered at 2× for sharp display. Keyless free tier; next/image caches each result, so repeat
 * views don't reach thum.io again. (Host allowed in next.config.ts `images.remotePatterns`.)
 *
 * Null for anything but an http(s) URL (mailto:, relative paths, junk): thum.io can't capture
 * those, and a request would only come back as a broken image.
 */
export function screenshotUrl(url: string, width: number, height: number): string | null {
  let target: URL
  try {
    target = new URL(url)
  } catch {
    return null
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return null
  const crop = Math.round((VIEWPORT_WIDTH * height) / width)
  // The target is the path tail: encode "#" so a hash-routed URL's fragment reaches thum.io
  // instead of being read as the fragment of the screenshot URL itself.
  const tail = target.toString().replace(/#/g, "%23")
  return `https://image.thum.io/get/noanimate/viewportWidth/${VIEWPORT_WIDTH}/width/${width * 2}/crop/${crop}/${tail}`
}
