import { ArrowUpRight, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Container } from "@/components/dashboard/layout"
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/panel"
import { CopyButton } from "@/components/portable-text/copy-button"
import { formatDate } from "@/lib/format"
import { identityLines } from "@/lib/identity"
import { fingerprintGroups, keyValidity, parseClearsigned } from "@/lib/pgp"
import { pgpKey, signedIdentity } from "@/lib/pgp.generated"
import { siteConfig } from "@/lib/site"
import { KeyValidity } from "./key-validity"

const ARMOR = "font-mono text-[0.6875rem] leading-5 text-muted-foreground select-none"
// The apex redirects to www, hence `-L`; short enough to fit the panel.
const HOST = new URL(siteConfig.url).hostname.replace(/^www\./, "")
const LINK = "transition-colors hover:text-foreground"

/**
 * The page's sign-off: Ashik's identity statement as the real clearsigned PGP message
 * (also at /identity.asc), the key that signed it, and how to check it yourself.
 *
 * `extraLinks`: pages that only exist once they have content (e.g. /now).
 */
export function SiteFooter({
  extraLinks = [],
}: {
  extraLinks?: { label: string; href: string }[]
}) {
  const fullSha = process.env.VERCEL_GIT_COMMIT_SHA
  const siteLinks = [
    ...siteConfig.nav.filter((link) => link.href !== "/#contact"),
    ...extraLinks,
    { label: "Contact", href: "/#contact" },
    { label: "RSS feed", href: "/rss.xml" },
    { label: "Sitemap", href: "/sitemap.xml" },
  ]

  return (
    <footer className="mt-auto border-t bg-surface">
      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-16">
        <SignedStatement />
        <SigningKey />
      </Container>

      <div className="border-t">
        <Container className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {siteLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 label-caps">
            <span>
              © {new Date().getFullYear()} {siteConfig.name}
            </span>
            {fullSha ? (
              <a
                href={`${siteConfig.repo}/commit/${fullSha}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 ${LINK}`}
              >
                build {fullSha.slice(0, 7)}
                <ArrowUpRight className="size-3" aria-hidden />
              </a>
            ) : (
              <span>build local</span>
            )}
          </p>
        </Container>
      </div>
    </footer>
  )
}

/** The statement exactly as signed, set as a message between its armor lines. */
function SignedStatement() {
  const message = parseClearsigned(signedIdentity)
  if (!message) return null
  const [firstSigLine, ...sigLines] = message.signature

  return (
    <figure className="min-w-0">
      <figcaption className="sr-only">
        My identity statement, signed with my PGP key. The full signed text is at /identity.asc.
      </figcaption>
      <div aria-hidden className={ARMOR}>
        <p>-----BEGIN PGP SIGNED MESSAGE-----</p>
        {message.headers.map((header) => (
          <p key={header}>{header}</p>
        ))}
      </div>

      <div className="my-3 border-l pl-4 sm:pl-5">
        <p className="text-lg font-semibold tracking-tight">{siteConfig.name}</p>
        <p className="mt-1 max-w-prose text-pretty text-muted-foreground">{siteConfig.tagline}</p>

        <dl className="mt-5 grid grid-cols-[4.25rem_minmax(0,1fr)] gap-y-1.5 text-sm sm:grid-cols-[6rem_minmax(0,1fr)]">
          {identityLines().map(({ label, value }) => {
            const internal = value === siteConfig.url
            return (
              <div key={label} className="contents">
                <dt className="font-mono text-xs leading-6 text-muted-foreground sm:text-[0.8125rem]">
                  {label}
                </dt>
                <dd className="min-w-0 font-mono text-xs leading-6 sm:text-[0.8125rem]">
                  <a
                    href={value}
                    {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer me" })}
                    className="group inline-flex max-w-full items-center gap-1 underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
                  >
                    <span className="truncate">
                      {/* The scheme is part of the signed text; phones drop it for width. */}
                      <span className="hidden text-muted-foreground sm:inline">https://</span>
                      {value.replace(/^https:\/\//, "")}
                    </span>
                    {!internal && (
                      <ArrowUpRight
                        className="size-3 shrink-0 text-muted-foreground group-hover:text-foreground"
                        aria-hidden
                      />
                    )}
                  </a>
                </dd>
              </div>
            )
          })}
        </dl>
      </div>

      <div className={ARMOR}>
        <p aria-hidden>-----BEGIN PGP SIGNATURE-----</p>
        <details className="group">
          <summary className="flex max-w-full cursor-pointer list-none items-center gap-2 rounded-sm hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="size-3 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
              aria-hidden
            />
            <span className="sr-only">Show the signature</span>
            <span
              aria-hidden
              className="truncate group-open:break-all group-open:whitespace-normal"
            >
              {firstSigLine}
            </span>
          </summary>
          <pre className="pl-5 break-all whitespace-pre-wrap select-text">
            {sigLines.join("\n")}
          </pre>
        </details>
        <p aria-hidden>-----END PGP SIGNATURE-----</p>
      </div>
    </figure>
  )
}

/** The key that signed the statement, with its measured validity and a way to verify. */
function SigningKey() {
  const groups = fingerprintGroups(pgpKey.fingerprint)
  const verify = [
    `curl -sL ${HOST}/pgp.asc | gpg --import`,
    `curl -sL ${HOST}/identity.asc | gpg --verify`,
  ].join("\n")

  return (
    <Panel className="self-start">
      <PanelHeader
        title="pgp key"
        meta={<KeyValidity expiresAt={pgpKey.expiresAt} initial={keyValidity(pgpKey.expiresAt)} />}
      />
      <PanelBody className="space-y-5">
        <div>
          <p className="label-caps" id="pgp-fingerprint">
            Fingerprint
          </p>
          <div className="mt-2 flex items-start justify-between gap-3">
            {/* gpg's layout: two rows of five groups; the long key ID (last four) in ink. */}
            <p
              aria-labelledby="pgp-fingerprint"
              className="grid grid-cols-5 gap-x-2 font-mono text-[0.9375rem] leading-7 tabular-nums"
            >
              {groups.map((group, i) => (
                <span
                  key={i}
                  className={i < groups.length - 4 ? "text-muted-foreground" : "text-foreground"}
                >
                  {group}
                </span>
              ))}
            </p>
            <CopyButton
              text={pgpKey.fingerprint}
              label="Copy fingerprint"
              className="-mt-0.5 -mr-2"
            />
          </div>
          {pgpKey.createdAt && (
            <p className="mt-2 label-caps">
              {pgpKey.algorithm} · created {formatDate(pgpKey.createdAt)}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="label-caps">Verify it yourself</p>
            <CopyButton text={verify} label="Copy commands" className="-my-1.5 -mr-2" />
          </div>
          {/* Scrolls sideways on phones, so it must be reachable by keyboard too. */}
          <pre
            tabIndex={0}
            role="region"
            aria-label="Commands to verify the signature"
            className="mt-2 overflow-x-auto rounded-md bg-surface-2 px-3 py-2.5 font-mono text-xs leading-5"
          >
            {verify}
          </pre>
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li>
            <a
              href="/pgp.asc"
              className={`inline-flex items-center gap-1 text-muted-foreground ${LINK}`}
            >
              Public key
              <span className="font-mono text-xs">/pgp.asc</span>
            </a>
          </li>
          <li>
            <a
              href="/identity.asc"
              className={`inline-flex items-center gap-1 text-muted-foreground ${LINK}`}
            >
              Signed statement
              <span className="font-mono text-xs">/identity.asc</span>
            </a>
          </li>
        </ul>
      </PanelBody>
    </Panel>
  )
}
