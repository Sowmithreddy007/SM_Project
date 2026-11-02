import type { PostStatus, ReviewStatus } from '../lib/types'
import { REVIEW_STATUS_LABEL, STATUS_LABEL } from '../lib/format'

const POST_STYLES: Record<PostStatus, string> = {
  DRAFT: 'border-dashed border-rule-strong text-muted',
  IN_REVIEW: 'border-rule-strong text-graphite',
  CHANGES_REQUESTED: 'border-paper text-paper badge-hatch',
  APPROVED: 'border-paper text-paper',
  POSTED: 'border-paper bg-paper text-ink',
  CANCELLED: 'border-dashed border-rule text-muted line-through',
}

const POST_GLYPH: Record<PostStatus, string> = {
  DRAFT: '□',
  IN_REVIEW: '◧',
  CHANGES_REQUESTED: '▨',
  APPROVED: '✓',
  POSTED: '■',
  CANCELLED: '×',
}

const REVIEW_STYLES: Record<ReviewStatus, string> = {
  PREPARED: 'border-dashed border-rule-strong text-muted',
  SENT: 'border-rule-strong text-graphite',
  APPROVED: 'border-paper text-paper',
  CHANGES_REQUESTED: 'border-paper text-paper badge-hatch',
  SUPERSEDED: 'border-dashed border-rule text-muted line-through',
}

const REVIEW_GLYPH: Record<ReviewStatus, string> = {
  PREPARED: '□',
  SENT: '◧',
  APPROVED: '✓',
  CHANGES_REQUESTED: '▨',
  SUPERSEDED: '×',
}

export function StatusBadge({ status, className = '' }: { status: PostStatus; className?: string }) {
  return (
    <span className={`badge ${POST_STYLES[status]} ${className}`}>
      <span aria-hidden="true" className="text-[11px] leading-none">
        {POST_GLYPH[status]}
      </span>
      {STATUS_LABEL[status]}
    </span>
  )
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={`badge ${REVIEW_STYLES[status]}`}>
      <span aria-hidden="true" className="text-[11px] leading-none">
        {REVIEW_GLYPH[status]}
      </span>
      {REVIEW_STATUS_LABEL[status]}
    </span>
  )
}

export function StatusMark({
  status,
  className = '',
}: {
  status: PostStatus
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block w-3.5 shrink-0 text-center font-sans text-[12px] leading-none ${className}`}
    >
      {POST_GLYPH[status]}
    </span>
  )
}

export const STATUS_GLYPH = POST_GLYPH
