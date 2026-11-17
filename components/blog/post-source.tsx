import { FileText, KeyRound } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/panel"
import { CopyButton } from "@/components/portable-text/copy-button"
import { formatDate } from "@/lib/format"
import { fingerprintGroups } from "@/lib/pgp"
import { siteConfig } from "@/lib/site"

// Short enough for the panel; the apex redirects to www, hence -L (as in the footer).
const HOST = new URL(siteConfig.url).hostname.replace(/^www\./, "")
const LINK =
  "inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"

/**
 * The post's English original as Markdown (/post/<slug>.md) and, once `npm run sign` has signed
 * this exact text, its PGP signature with the commands to check it.
 */
export function PostSource({ slug, signedAt }: { slug: string; signedAt: string | null | false }) {
  const t = useTranslations("posts")
  const footer = useTranslations("footer")
  const locale = useLocale()
  const signed = signedAt !== false
  // The long key ID: the fingerprint's last four groups, as gpg prints it.
  const keyId = fingerprintGroups(siteConfig.pgpFingerprint).slice(-4).join(" ")
  const verify = [
    `curl -sL ${HOST}/pgp.asc | gpg --import`,
    `curl -sL -O ${HOST}/post/${slug}.md -O ${HOST}/post/${slug}.md.asc`,
    `gpg --verify ${slug}.md.asc ${slug}.md`,
  ].join("\n")

  return (
    <Panel>
      <PanelHeader
        title={t("sourceTitle")}
        meta={
          signed && (
            <span className="inline-flex items-center gap-1.5">
              <KeyRound className="size-3" aria-hidden />
              {t("sourceSigned")}
            </span>
          )
        }
      />
      <PanelBody className="space-y-4">
        <p className="max-w-prose text-sm text-pretty text-muted-foreground">
          {signed
            ? t("sourceSignedText", {
                keyId,
                date: (signedAt && formatDate(signedAt, locale)) || "",
              })
            : t("sourceText")}
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li>
            <a href={`/post/${slug}.md`} className={LINK}>
              <FileText className="size-3.5" aria-hidden />
              {t("sourceMarkdown")}
              <span className="font-mono text-xs">.md</span>
            </a>
          </li>
          {signed && (
            <li>
              <a href={`/post/${slug}.md.asc`} className={LINK}>
                <KeyRound className="size-3.5" aria-hidden />
                {t("sourceSignature")}
                <span className="font-mono text-xs">.md.asc</span>
              </a>
            </li>
          )}
        </ul>
        {signed && (
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="label-caps">{footer("verify")}</p>
              <CopyButton text={verify} label={footer("copyCommands")} className="-my-1.5 -mr-2" />
            </div>
            {/* Scrolls sideways on phones, so it must be reachable by keyboard too. */}
            <pre
              tabIndex={0}
              role="region"
              aria-label={footer("verifyCommands")}
              className="mt-2 overflow-x-auto rounded-md bg-surface-2 px-3 py-2.5 font-mono text-xs leading-5"
            >
              {verify}
            </pre>
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}
