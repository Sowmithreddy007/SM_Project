import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { POST_TYPE_LABEL, STATUS_LABEL } from '../lib/format'
import type { PostStatus, PostSummary } from '../lib/types'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { StatusBadge, StatusMark } from '../components/StatusBadge'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const LEGEND: PostStatus[] = ['DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'POSTED']

export default function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  const rangeStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const rangeEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
  const fromDate = format(rangeStart, 'yyyy-MM-dd')
  const toDate = format(rangeEnd, 'yyyy-MM-dd')

  const posts = useQuery({
    queryKey: ['posts', 'calendar', fromDate, toDate],
    queryFn: () => api.posts({ fromDate, toDate }),
  })

  const byDay = new Map<string, PostSummary[]>()
  for (const post of posts.data ?? []) {
    const key = post.publishDate.slice(0, 10)
    const bucket = byDay.get(key) ?? []
    bucket.push(post)
    byDay.set(key, bucket)
  }

  const today = new Date()
  const mobileDays = days.filter(
    (day) => isSameMonth(day, month) && (byDay.get(format(day, 'yyyy-MM-dd'))?.length ?? 0) > 0,
  )

  const dayPostsFor = (day: Date) =>
    (byDay.get(format(day, 'yyyy-MM-dd')) ?? [])
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title))

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Calendar"
        description="A month view of planned publish dates. Scheduling itself stays manual."
        actions={
          <Link to="/posts/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            New post
          </Link>
        }
      />

      <div className="flex flex-col gap-5 border-y border-rule py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center border border-rule-strong text-graphite transition-colors hover:border-paper hover:text-paper"
            onClick={() => setMonth((value) => subMonths(value, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center border border-rule-strong text-graphite transition-colors hover:border-paper hover:text-paper"
            onClick={() => setMonth((value) => addMonths(value, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-3 font-serif text-4xl leading-none tracking-[-0.02em]">
            {format(month, 'MMMM')}{' '}
            <span className="italic text-muted">{format(month, 'yyyy')}</span>
          </h2>
        </div>
        <button
          type="button"
          className="link-arrow w-fit"
          onClick={() => setMonth(startOfMonth(new Date()))}
        >
          Today
        </button>
      </div>

      {posts.isLoading ? <LoadingState label="Loading the month…" /> : null}

      {posts.isError ? (
        <div className="pt-8">
          <ErrorState message="The calendar could not be loaded." onRetry={() => posts.refetch()} />
        </div>
      ) : null}

      {posts.isSuccess ? (
        <>
          <div className="hidden border-y border-rule md:block">
            <div className="grid grid-cols-7 border-b border-rule">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="px-3 py-3.5 text-center font-sans text-[11px] font-medium text-muted"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const key = format(day, 'yyyy-MM-dd')
                const dayPosts = dayPostsFor(day)
                const inMonth = isSameMonth(day, month)
                const isToday = isSameDay(day, today)
                const lastColumn = index % 7 === 6
                const lastRow = index >= days.length - 7
                return (
                  <div
                    key={key}
                    className={`group relative min-h-[156px] p-3 ${
                      lastColumn ? '' : 'border-r'
                    } ${lastRow ? '' : 'border-b'} border-rule ${
                      inMonth ? 'bg-ink' : 'bg-surface/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={
                          isToday
                            ? 'flex h-8 min-w-8 items-center justify-center bg-paper px-1 font-sans text-[15px] leading-none font-medium text-ink'
                            : `font-sans text-[15px] leading-none font-medium tabular-nums ${
                                inMonth ? 'text-paper' : 'text-muted'
                              }`
                        }
                      >
                        {format(day, 'd')}
                      </span>
                      <Link
                        to={`/posts/new?date=${key}`}
                        className="flex h-7 w-7 items-center justify-center border border-transparent text-muted opacity-0 transition-all group-hover:border-rule-strong group-hover:opacity-100 hover:border-paper hover:text-paper focus:opacity-100"
                        aria-label={`Add post on ${format(day, 'd MMMM yyyy')}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="mt-3 space-y-2">
                      {dayPosts.slice(0, 2).map((post) => (
                        <Link
                          key={post.id}
                          to={`/posts/${post.id}`}
                          className="flex items-start gap-2 text-[12px] leading-5 text-graphite transition-colors hover:text-paper"
                          title={`${post.title} · ${STATUS_LABEL[post.status]}`}
                        >
                          <StatusMark status={post.status} className="text-paper" />
                          <span className="truncate">{post.title}</span>
                        </Link>
                      ))}
                      {dayPosts.length > 2 ? (
                        <span
                          className="block truncate text-[11px] text-muted"
                          title={dayPosts
                            .slice(2)
                            .map((post) => post.title)
                            .join(' · ')}
                        >
                          +{dayPosts.length - 2} more
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-b border-rule md:hidden">
            {mobileDays.length === 0 ? (
              <EmptyState
                title="No posts planned"
                description="No content is scheduled in this month yet."
                action={
                  <Link to="/posts/new" className="btn btn-secondary btn-sm">
                    <Plus className="h-3.5 w-3.5" />
                    Create a post
                  </Link>
                }
              />
            ) : (
              mobileDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const dayPosts = dayPostsFor(day)
                return (
                  <div key={key} className="border-b border-rule py-6 last:border-b-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-sans text-xl leading-none font-medium">
                        {format(day, 'd')}{' '}
                        <span className="text-muted">{format(day, 'MMM')}</span>
                      </p>
                      <span className="meta">{format(day, 'EEEE')}</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {dayPosts.map((post) => (
                        <Link
                          key={post.id}
                          to={`/posts/${post.id}`}
                          className="flex items-start justify-between gap-3 border-t border-rule pt-3"
                        >
                          <span className="flex min-w-0 items-start gap-2">
                            <StatusMark status={post.status} className="mt-0.5 text-paper" />
                            <span className="min-w-0">
                              <span className="block truncate text-[14px] text-graphite">
                                {post.title}
                              </span>
                              <span className="mt-1 block text-[12px] text-muted">
                                {POST_TYPE_LABEL[post.postType]}
                              </span>
                            </span>
                          </span>
                          <StatusBadge status={post.status} />
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule py-5">
            {LEGEND.map((status) => (
              <span key={status} className="inline-flex items-center gap-2">
                <StatusMark status={status} className="text-paper" />
                <span className="text-[12px] text-muted">{STATUS_LABEL[status]}</span>
              </span>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
