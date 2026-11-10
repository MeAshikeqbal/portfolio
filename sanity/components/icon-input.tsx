import { SearchIcon } from "./icons"
import { Box, Button, Card, Flex, Grid, Spinner, Stack, Text, TextInput } from "@sanity/ui"
import { useEffect, useState } from "react"
import { set, type StringInputProps } from "sanity"

import { BUNDLED_ICON_SETS, iconUrl } from "../../lib/icons"
import { iconExists } from "../lib/icon-check"

const SEARCH_URL = "https://api.iconify.design/search"
const MONO = "var(--font-geist-mono), ui-monospace, monospace"

/** Icons render as <img>, where `currentColor` is black: show them on a light tile in both themes. */
function IconTile({ name, size = 32 }: { name: string; size?: number }) {
  const url = iconUrl(name)
  return (
    <Box
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: "#f4f4f5",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- Studio-only preview of a same-origin SVG
        <img src={url} alt="" width={size * 0.6} height={size * 0.6} />
      )}
    </Box>
  )
}

function useIconStatus(name: string | undefined) {
  const [status, setStatus] = useState<{ key: string; found: boolean | null }>()
  // Bumped by "Check again" after a failed check, to re-run it for the same name.
  const [attempt, setAttempt] = useState(0)
  const key = `${name}#${attempt}`
  useEffect(() => {
    if (!name) return
    let cancelled = false
    iconExists(name).then((found) => !cancelled && setStatus({ key, found }))
    return () => {
      cancelled = true
    }
  }, [name, key])
  // Ignore a result for a previous value (or attempt) while the new one is being checked.
  const found = status && status.key === key ? status.found : undefined
  return { found, retry: () => setAttempt((n) => n + 1) }
}

function useIconSearch(query: string) {
  const [state, setState] = useState<{ query: string; icons?: string[]; error?: string }>({
    query: "",
  })
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        query: q,
        prefixes: BUNDLED_ICON_SETS.join(","),
        limit: "48",
      })
      fetch(`${SEARCH_URL}?${params}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`Search failed (${response.status})`)
          return response.json() as Promise<{ icons?: string[] }>
        })
        .then((data) => setState({ query: q, icons: data.icons ?? [] }))
        .catch((error: Error) => {
          if (error.name !== "AbortError") setState({ query: q, error: error.message })
        })
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const q = query.trim()
  if (q.length < 2) return { idle: true as const }
  if (state.query !== q) return { loading: true as const }
  return state
}

/**
 * Iconify-name input with a live preview, a check that the icon exists in the bundled sets,
 * and a search limited to those sets (the site can only serve icons it bundles).
 */
export function IconInput(props: StringInputProps) {
  const { value, onChange, readOnly } = props
  const [query, setQuery] = useState("")
  const { found, retry } = useIconStatus(value)
  const search = useIconSearch(query)

  return (
    <Stack gap={3}>
      <Flex gap={3} align="center">
        {value && <IconTile name={value} />}
        <Box flex={1}>{props.renderDefault(props)}</Box>
      </Flex>
      {value && (
        <Text
          size={1}
          style={{
            color:
              found === false
                ? "var(--card-badge-critical-dot-color)"
                : found
                  ? "var(--card-badge-positive-dot-color)"
                  : undefined,
          }}
          muted={found === undefined || found === null}
        >
          {found === undefined
            ? "Checking…"
            : found === null
              ? "Couldn't check this icon. "
              : found
                ? "Icon found."
                : `Not available: use an icon from ${BUNDLED_ICON_SETS.join(", ")}.`}
          {found === null && (
            <Button mode="bleed" fontSize={1} padding={1} text="Check again" onClick={retry} />
          )}
        </Text>
      )}
      {!readOnly && (
        <Card padding={3} radius={2} border tone="transparent">
          <Stack gap={3}>
            <TextInput
              icon={SearchIcon}
              placeholder="Search icons, e.g. docker, postgres, terminal"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              aria-label="Search icons"
            />
            {"loading" in search && (
              <Flex justify="center" paddingY={2}>
                <Spinner muted />
              </Flex>
            )}
            {"error" in search && search.error && (
              <Text size={1} muted>
                {search.error}
              </Text>
            )}
            {"icons" in search && search.icons && search.icons.length === 0 && (
              <Text size={1} muted>
                No icons found.
              </Text>
            )}
            {"icons" in search && search.icons && search.icons.length > 0 && (
              <Grid gridTemplateColumns={[4, 6, 8]} gap={2}>
                {search.icons.map((name) => (
                  <Button
                    key={name}
                    mode={name === value ? "default" : "ghost"}
                    tone={name === value ? "primary" : "default"}
                    padding={2}
                    title={name}
                    aria-label={`Use ${name}`}
                    onClick={() => onChange(set(name))}
                  >
                    <Stack gap={2} style={{ alignItems: "center" }}>
                      <IconTile name={name} size={28} />
                      <Text
                        size={0}
                        muted
                        textOverflow="ellipsis"
                        style={{ fontFamily: MONO, maxWidth: 72 }}
                      >
                        {name.split(":")[1]}
                      </Text>
                    </Stack>
                  </Button>
                ))}
              </Grid>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  )
}

/** Field validation: warn (in the Studio) when the icon doesn't exist in the bundled sets. */
export async function validateIcon(name: string | undefined): Promise<true | string> {
  if (!name) return true
  return (await iconExists(name)) === false
    ? `“${name}” isn't in the bundled icon sets (${BUNDLED_ICON_SETS.join(", ")}).`
    : true
}
