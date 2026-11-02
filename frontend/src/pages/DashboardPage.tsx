import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ArrowUpRight, CircleAlert, Inbox, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { useCurrentUser } from '../lib/auth'
import { formatDate, POST_TYPE_LABEL } from '../lib/format'
import type { PostStatus, PostSummary } from '../lib/types'
import { ErrorState, LoadingState } from '../components/ui'
import { PlatformPills } from '../components/PlatformPills'
import { StatusBadge } from '../components/StatusBadge'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function SectionHeading({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-t border-rule-strong pt-6">
      <h2 className="section-title">{title}</h2>
      {action}
    </div>
  )
}

function StatCell({
  to,
  label,
  value,
  note,
}: {
  to: string
  label: string
  value: number
  note: string
}) {
  return (
    <Link to={to} className="stat-cell group relative flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-[13px] font-medium text-muted">{label}</span>
        <ArrowUpRight className="h-4 w-4 text-muted transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-paper" />
      </div>
      <p className="mt-10 font-sans text-5xl leading-none font-medium tracking-[-0.04em] tabular-nums sm:text-6xl">
        {value}
      </p>
      <p className="mt-4 text-[13px] leading-6 text-muted">{note}</p>
    </Link>
  )
}

function ReviewLine({ post }: { post: PostSummary }) {
  return (
    <Link
      to={`/posts/${post.id}`}
      className="group flex flex-col gap-3 border-b border-rule py-6 transition-colors hover:bg-surface sm:grid sm:grid-cols-[1fr_auto] sm:gap-6 sm:px-2"
    >
      <div className="min-w-0">
        <p className="font-sans text-[16px] leading-6 font-medium tracking-[-0.01em] text-paper group-hover:underline group-hover:decoration-paper/40 group-hover:underline-offset-4">
          {post.title}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
          <span>{formatDate(post.publishDate)}</span>
          <span className="h-1 w-1 bg-rule-strong" aria-hidden="true" />
          <span>{POST_TYPE_LABEL[post.postType]}</span>
          <span className="h-1 w-1 bg-rule-strong" aria-hidden="true" />
          <span>{post.assignee.fullName}</span>
        </p>
        <div className="mt-3">
          <PlatformPills platforms={post.platforms} compact />
        </div>
      </div>
      <div className="sm:pt-1">
        <StatusBadge status={post.status} />
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const user = useCurrentUser()
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard })

  if (dashboard.isLoading) return <LoadingState label="Preparing your dashboard…" />
  if (dashboard.isError) {
    return (
      <ErrorState
        message="We could not load your dashboard."
        onRetry={() => dashboard.refetch()}
      />
    )
  }

  const data = dashboard.data!
  const firstName = user?.fullName.split(' ')[0] ?? 'there'
  const today = data.today ? parseISO(data.today) : new Date()
  const total = Math.max(data.totalPosts, 1)

  const pipeline: { label: string; value: number; status: PostStatus }[] = [
    { label: 'Drafts', value: data.drafts, status: 'DRAFT' },
    { label: 'In review', value: data.inReview, status: 'IN_REVIEW' },
    { label: 'Changes', value: data.changesRequested, status: 'CHANGES_REQUESTED' },
    { label: 'Approved', value: data.approved, status: 'APPROVED' },
    { label: 'Posted', value: data.posted, status: 'POSTED' },
    { label: 'Cancelled', value: data.cancelled, status: 'CANCELLED' },
  ]

  return (
    <div>
      <header className="border-t border-paper/70 pt-7">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="min-w-0 max-w-3xl">
            <p className="eyebrow">Overview / {format(today, 'EEEE, d MMMM yyyy')}</p>
            <h1 className="mt-5 font-serif text-[clamp(2.75rem,5.5vw,5.25rem)] leading-[0.92] tracking-[-0.035em]">
              {greeting()},
              <br />
              <span className="italic">{firstName}.</span>
            </h1>
            <p className="mt-7 max-w-xl text-[15px] leading-7 text-muted">
              Here is where the SPECANCIENS content pipeline stands today.
            </p>
          </div>
          <Link to="/posts/new" className="btn btn-primary w-fit">
            <Plus className="h-4 w-4" />
            New post
          </Link>
        </div>
      </header>

      <div className="mt-16 grid gap-px border-y border-rule bg-rule sm:grid-cols-2 xl:grid-cols-4">
        <StatCell
          to="/tracker?status=IN_REVIEW"
          label="In review"
          value={data.inReview}
          note="Waiting for the President"
        />
        <StatCell
          to="/tracker?status=CHANGES_REQUESTED"
          label="Changes"
          value={data.changesRequested}
          note="Needs edits and a new round"
        />
        <StatCell
          to="/tracker?status=APPROVED"
          label="Approved"
          value={data.approved}
          note="Ready to publish"
        />
        <StatCell
          to="/tracker?status=POSTED"
          label="Posted"
          value={data.posted}
          note={`${data.totalPosts} posts in the tracker`}
        />
      </div>

      {data.overdue.length > 0 ? (
        <div className="mt-12 flex flex-col gap-5 border-l-2 border-paper bg-surface px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-paper" />
            <div>
              <p className="text-[14px] font-medium text-paper">
                {data.overdue.length} post{data.overdue.length === 1 ? '' : 's'} passed the planned
                date
              </p>
              <p className="mt-1.5 text-[13px] leading-6 text-muted">
                {data.overdue.map((post) => post.title).join(' · ')}
              </p>
            </div>
          </div>
          <Link to="/tracker" className="btn btn-secondary btn-sm shrink-0">
            Review in tracker
          </Link>
        </div>
      ) : null}

      {data.totalPosts === 0 ? (
        <div className="mt-12 border border-dashed border-rule-strong px-6 py-16 text-center">
          <p className="font-sans text-2xl font-medium tracking-[-0.02em]">The tracker is empty</p>
          <p className="mt-3 text-[14px] leading-6 text-muted">
            Create the first post to start the review workflow.
          </p>
          <Link to="/posts/new" className="btn btn-primary mt-8">
            <Plus className="h-4 w-4" />
            Create first post
          </Link>
        </div>
      ) : null}

      <div className="mt-20 grid gap-16 lg:grid-cols-[1.35fr_1fr]">
        <section>
          <SectionHeading
            title="Waiting for review"
            action={
              <Link to="/tracker?status=IN_REVIEW" className="link-arrow">
                View all
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />

          {data.reviewQueue.length === 0 ? (
            <div className="flex flex-col items-center border-b border-rule py-20 text-center">
              <span className="flex h-11 w-11 items-center justify-center border border-rule-strong text-[13px]">
                ✓
              </span>
              <p className="mt-5 font-sans text-xl font-medium tracking-[-0.02em]">
                The review queue is clear
              </p>
              <p className="mt-2 text-[13px] leading-6 text-muted">
                Nothing is waiting on the President right now.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              {data.reviewQueue.map((post) => (
                <ReviewLine key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeading title="Coming up" />

          {data.upcomingApproved.length === 0 ? (
            <div className="flex flex-col items-center border-b border-rule py-16 text-center">
              <Inbox className="h-5 w-5 text-muted" />
              <p className="mt-4 font-sans text-xl font-medium tracking-[-0.02em]">
                No approved posts scheduled
              </p>
              <p className="mt-2 text-[13px] leading-6 text-muted">
                Approved content with a future date appears here.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-rule border-b border-rule">
              {data.upcomingApproved.map((post) => (
                <Link
                  key={post.id}
                  to={`/posts/${post.id}`}
                  className="group flex items-start gap-5 py-5"
                >
                  <span className="w-10 shrink-0 font-sans text-2xl leading-none font-medium tracking-[-0.03em] tabular-nums">
                    {format(parseISO(post.publishDate), 'dd')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-6 font-medium text-paper group-hover:underline group-hover:underline-offset-4">
                      {post.title}
                    </p>
                    <p className="mt-1.5 text-[12px] text-muted">
                      {format(parseISO(post.publishDate), 'MMM')} / {post.assignee.fullName}
                    </p>
                  </div>
                  <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-20">
        <SectionHeading
          title="Pipeline at a glance"
          action={<span className="meta">{data.totalPosts} total</span>}
        />

        <div className="mt-6 grid border-y border-rule sm:grid-cols-2 lg:grid-cols-6">
          {pipeline.map((item) => (
            <Link
              key={item.label}
              to={`/tracker?status=${item.status}`}
              className="group border-b border-rule px-5 py-6 transition-colors hover:bg-surface sm:border-r sm:last:border-r-0 lg:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-muted">{item.label}</span>
                <span className="font-sans text-2xl leading-none font-medium tabular-nums">
                  {item.value}
                </span>
              </div>
              <div className="mt-6 h-px w-full bg-rule-strong">
                <div
                  className={`h-px ${
                    item.status === 'CHANGES_REQUESTED'
                      ? 'bar-hatch'
                      : item.status === 'CANCELLED'
                        ? 'bg-rule-strong'
                        : 'bg-paper'
                  }`}
                  style={{ width: item.value === 0 ? '0%' : `${Math.max(5, (item.value / total) * 100)}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-20 grid gap-10 border-t border-rule-strong pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">A gentle reminder</p>
          <p className="mt-5 max-w-3xl text-[18px] leading-8 text-graphite">
            Posting and scheduling stay manual. Once something goes live, mark it posted with the
            live link so the tracker and Excel backup stay accurate.
          </p>
        </div>
        <Link to="/tracker" className="btn btn-secondary w-fit">
          Open content tracker
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  )
}
