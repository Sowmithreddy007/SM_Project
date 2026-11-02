import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Download, FilterX, Plus, Search } from 'lucide-react'
import { api } from '../lib/api'
import { isAdmin, useCurrentUser } from '../lib/auth'
import { formatDate, fromNow, POST_TYPE_LABEL, STATUS_LABEL } from '../lib/format'
import type { PostStatus, PostType } from '../lib/types'
import { useToast } from '../components/Toast'
import { Avatar, EmptyState, ErrorState, LoadingState, PageHeader, Spinner } from '../components/ui'
import { PlatformPills } from '../components/PlatformPills'
import { StatusBadge, StatusMark } from '../components/StatusBadge'

const STATUSES: PostStatus[] = [
  'DRAFT',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'POSTED',
  'CANCELLED',
]

const TYPES: PostType[] = ['POST', 'REEL', 'STORY', 'OTHER']

export default function TrackerPage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const status = params.get('status') ?? ''
  const postType = params.get('type') ?? ''
  const assigneeId = params.get('assignee') ?? ''
  const [searchText, setSearchText] = useState(params.get('search') ?? '')
  const [search, setSearch] = useState(searchText)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchText), 320)
    return () => window.clearTimeout(timer)
  }, [searchText])

  const users = useQuery({
    queryKey: ['userOptions'],
    queryFn: api.userOptions,
    staleTime: 5 * 60 * 1000,
  })

  const posts = useQuery({
    queryKey: ['posts', { status, postType, assigneeId, search }],
    queryFn: () => api.posts({ status, postType, assigneeId, search }),
  })

  const exportMutation = useMutation({
    mutationFn: api.downloadCurrentExcel,
    onSuccess: () => toast.success('Excel download started'),
    onError: () => toast.error('Could not download the workbook'),
  })

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const clearFilters = () => {
    setSearchText('')
    setSearch('')
    setParams(new URLSearchParams(), { replace: true })
  }

  const hasFilters = Boolean(status || postType || assigneeId || search.trim())
  const results = posts.data ?? []
  const counts = useMemo(() => {
    const map = new Map<PostStatus, number>()
    for (const post of results) map.set(post.status, (map.get(post.status) ?? 0) + 1)
    return map
  }, [results])

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Content tracker"
        description="Every post, owner, planned date and review round in one place."
        actions={
          <>
            {isAdmin(user) ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
              >
                {exportMutation.isPending ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Excel
              </button>
            ) : null}
            <Link to="/posts/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              New post
            </Link>
          </>
        }
      />

      <div className="border-y border-rule">
        <div className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,.75fr)_minmax(0,.75fr)_minmax(0,.9fr)_auto] lg:items-end">
          <label>
            <span className="label">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-0 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className="input-flat pl-7"
                placeholder="Search by post name or caption…"
                aria-label="Search posts"
              />
            </div>
          </label>

          <label>
            <span className="label">Status</span>
            <select
              value={status}
              onChange={(event) => setFilter('status', event.target.value)}
              className="input-flat"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABEL[value]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="label">Type</span>
            <select
              value={postType}
              onChange={(event) => setFilter('type', event.target.value)}
              className="input-flat"
              aria-label="Filter by post type"
            >
              <option value="">All types</option>
              {TYPES.map((value) => (
                <option key={value} value={value}>
                  {POST_TYPE_LABEL[value]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="label">Assignee</span>
            <select
              value={assigneeId}
              onChange={(event) => setFilter('assignee', event.target.value)}
              className="input-flat"
              aria-label="Filter by assignee"
            >
              <option value="">Everyone</option>
              {(users.data ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.fullName}
                </option>
              ))}
            </select>
          </label>

          {hasFilters ? (
            <button type="button" className="btn btn-ghost btn-sm lg:mb-0.5" onClick={clearFilters}>
              <FilterX className="h-4 w-4" />
              Clear
            </button>
          ) : null}
        </div>

        {results.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule py-4">
            <span className="text-[13px] font-medium text-graphite">
              {results.length} {results.length === 1 ? 'post' : 'posts'}
            </span>
            {STATUSES.filter((value) => counts.get(value)).map((value) => (
              <span key={value} className="inline-flex items-center gap-2">
                <StatusMark status={value} className="text-paper" />
                <span className="text-[12px] text-muted">
                  {STATUS_LABEL[value]} {counts.get(value)}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {posts.isLoading ? <LoadingState label="Loading the tracker…" /> : null}

      {posts.isError ? (
        <div className="pt-10">
          <ErrorState message="The content tracker could not be loaded." onRetry={() => posts.refetch()} />
        </div>
      ) : null}

      {posts.isSuccess ? (
        results.length === 0 ? (
          <div className="border-b border-rule">
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title={hasFilters ? 'No posts match these filters' : 'No content yet'}
              description={
                hasFilters
                  ? 'Try a different status, type or search term.'
                  : 'Create the first draft to start tracking the content pipeline.'
              }
              action={
                hasFilters ? (
                  <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                    <FilterX className="h-4 w-4" />
                    Clear filters
                  </button>
                ) : (
                  <Link to="/posts/new" className="btn btn-primary">
                    <Plus className="h-4 w-4" />
                    New post
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse">
                <thead className="table-head">
                  <tr>
                    <th>Post</th>
                    <th>Platforms</th>
                    <th>Publish</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {results.map((post) => (
                    <tr
                      key={post.id}
                      className="table-row group cursor-pointer"
                      tabIndex={0}
                      role="link"
                      aria-label={`Open ${post.title}`}
                      onClick={() => navigate(`/posts/${post.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          navigate(`/posts/${post.id}`)
                        }
                      }}
                    >
                      <td>
                        <p className="max-w-[380px] truncate text-[15px] leading-6 font-medium tracking-[-0.01em] text-paper group-hover:underline group-hover:decoration-paper/40 group-hover:underline-offset-4">
                          {post.title}
                        </p>
                        <p className="mt-1.5 text-[12px] text-muted">
                          {POST_TYPE_LABEL[post.postType]} / Round {post.reviewRound}
                        </p>
                      </td>
                      <td>
                        <PlatformPills platforms={post.platforms} compact />
                      </td>
                      <td className="text-[13px] whitespace-nowrap text-graphite tabular-nums">
                        {formatDate(post.publishDate)}
                      </td>
                      <td>
                        <span className="flex items-center gap-2.5">
                          <Avatar name={post.assignee.fullName} size="xs" />
                          <span className="max-w-[190px] truncate text-[13px] text-graphite">
                            {post.assignee.fullName}
                          </span>
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="text-[12px] whitespace-nowrap text-muted">
                        {fromNow(post.updatedAt)}
                      </td>
                      <td>
                        <ArrowUpRight className="h-4 w-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-rule border-b border-rule lg:hidden">
              {results.map((post) => (
                <Link key={post.id} to={`/posts/${post.id}`} className="group block py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[16px] leading-6 font-medium tracking-[-0.01em] text-paper group-hover:underline group-hover:underline-offset-4">
                        {post.title}
                      </p>
                      <p className="mt-1.5 text-[12px] text-muted">
                        {POST_TYPE_LABEL[post.postType]} / Round {post.reviewRound}
                      </p>
                    </div>
                    <StatusBadge status={post.status} className="shrink-0" />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <PlatformPills platforms={post.platforms} compact />
                    <span className="text-[12px] text-muted">{formatDate(post.publishDate)}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2.5 border-t border-rule pt-4">
                    <Avatar name={post.assignee.fullName} size="xs" />
                    <span className="text-[13px] text-graphite">{post.assignee.fullName}</span>
                    <span className="ml-auto text-[12px] text-muted">{fromNow(post.updatedAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )
      ) : null}
    </div>
  )
}
