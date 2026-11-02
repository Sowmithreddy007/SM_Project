import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import type { Platform, PostStatus, PostType, ReviewStatus } from './types'

export function formatDate(value?: string | null): string {
  if (!value) return '—'
  return format(parseISO(value), 'dd MMM yyyy')
}

export function formatDateShort(value?: string | null): string {
  if (!value) return '—'
  return format(parseISO(value), 'dd MMM')
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  return format(parseISO(value), 'dd MMM yyyy, h:mm a')
}

export function fromNow(value?: string | null): string {
  if (!value) return '—'
  return formatDistanceToNowStrict(parseISO(value), { addSuffix: true })
}

export function toDateInputValue(value?: string | null): string {
  if (!value) return format(new Date(), 'yyyy-MM-dd')
  return value.slice(0, 10)
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export const POST_TYPE_LABEL: Record<PostType, string> = {
  POST: 'Post',
  REEL: 'Reel',
  STORY: 'Story',
  OTHER: 'Other',
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  LINKEDIN: 'LinkedIn',
}

export const STATUS_LABEL: Record<PostStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved',
  POSTED: 'Posted',
  CANCELLED: 'Cancelled',
}

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  PREPARED: 'Prepared',
  SENT: 'Sent',
  APPROVED: 'Approved',
  CHANGES_REQUESTED: 'Changes requested',
  SUPERSEDED: 'Superseded',
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

