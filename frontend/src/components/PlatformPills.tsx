import type { Platform } from '../lib/types'
import { PLATFORM_LABEL } from '../lib/format'

const SHORT_LABEL: Record<Platform, string> = {
  INSTAGRAM: 'IG',
  FACEBOOK: 'FB',
  LINKEDIN: 'LI',
}

const ORDER: Record<Platform, number> = {
  INSTAGRAM: 0,
  FACEBOOK: 1,
  LINKEDIN: 2,
}

export function PlatformPills({
  platforms,
  compact = false,
}: {
  platforms: Platform[]
  compact?: boolean
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {[...platforms].sort((a, b) => ORDER[a] - ORDER[b]).map((platform) => (
        <span
          key={platform}
          title={PLATFORM_LABEL[platform]}
          className="inline-flex items-center border border-rule-strong px-2 py-1 font-sans text-[11px] leading-none font-medium text-graphite"
        >
          {compact ? SHORT_LABEL[platform] : PLATFORM_LABEL[platform]}
        </span>
      ))}
    </span>
  )
}
