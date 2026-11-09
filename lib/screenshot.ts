/** Viewport the target page is rendered at before cropping and scaling. */
const VIEWPORT_WIDTH = 1280

/**
 * thum.io screenshot of a page's first screen, cropped to `width`×`height`'s aspect ratio and
 * rendered at 2× for sharp display. Keyless free tier; next/image caches each result, so repeat
 * views don't reach thum.io again. (Host allowed in next.config.ts `images.remotePatterns`.)
 */
export function screenshotUrl(url: string, width: number, height: number): string {
  const crop = Math.round((VIEWPORT_WIDTH * height) / width)
  return `https://image.thum.io/get/noanimate/viewportWidth/${VIEWPORT_WIDTH}/width/${width * 2}/crop/${crop}/${url}`
}
