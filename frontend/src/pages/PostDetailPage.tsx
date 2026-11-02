import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  Clock3,
  Copy,
  ExternalLink,
  Link2,
  Mail,
  Pencil,
  RotateCcw,
  Send,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { isAdmin, useCurrentUser } from '../lib/auth'
import {
  formatDate,
  formatDateTime,
  fromNow,
  PLATFORM_LABEL,
  POST_TYPE_LABEL,
  REVIEW_STATUS_LABEL,
} from '../lib/format'
import type { PostDetail, PrepareReviewResponse, Review } from '../lib/types'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { Avatar, ErrorState, KeyValue, LoadingState, Section, Spinner } from '../components/ui'
import { PlatformPills } from '../components/PlatformPills'
import { ReviewStatusBadge, StatusBadge } from '../components/StatusBadge'

const ACTIVITY_LABEL: Record<string, string> = {
  POST_CREATED: 'Post created',
  POST_UPDATED: 'Post details updated',
  REVIEW_PREPARED: 'Review email prepared',
  REVIEW_MARKED_SENT: 'Review email marked sent',
  REVIEW_APPROVED: 'Review approved',
  CHANGES_REQUESTED: 'Changes requested',
  POST_MARKED_POSTED: 'Marked as posted',
  POST_REOPENED: 'Post reopened',
  POST_CANCELLED: 'Post cancelled',
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy', 'Your browser blocked clipboard access.')
    }
  }

  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
      {copied ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

function ReviewTimeline({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <p className="mt-5 border-b border-rule pb-8 text-[14px] leading-7 text-muted">
        No review rounds yet. Prepare a Gmail review request when the draft is ready.
      </p>
    )
  }

  return (
    <ol className="mt-5 border-b border-rule">
      {reviews.map((review, index) => (
        <li key={review.id} className="relative border-t border-rule py-6 pl-9 first:border-t-0">
          {index < reviews.length - 1 ? (
            <span className="absolute top-6 bottom-0 left-[5px] w-px bg-rule-strong" aria-hidden="true" />
          ) : null}
          <span
            className={`absolute top-7 left-0 h-2.5 w-2.5 ${
              review.status === 'APPROVED' || review.status === 'CHANGES_REQUESTED'
                ? 'bg-paper'
                : 'border border-paper/60 bg-ink'
            }`}
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[15px] leading-none font-medium">Round {review.roundNumber}</p>
            <ReviewStatusBadge status={review.status} />
            <span className="text-[12px] text-muted">{formatDateTime(review.preparedAt)}</span>
          </div>
          <p className="mt-3 text-[13px] leading-6 text-muted">
            Prepared by {review.requestedByName ?? 'a team member'} for {review.recipientEmail}
          </p>
          {review.sentAt ? (
            <p className="mt-1 text-[12px] text-muted">Marked sent {fromNow(review.sentAt)}</p>
          ) : review.status === 'PREPARED' ? (
            <p className="mt-2 text-[12px] font-medium text-paper">
              Email draft not marked as sent yet
            </p>
          ) : null}
          {review.feedback ? (
            <blockquote className="mt-4 border-l border-paper/40 pl-4 text-[14px] leading-7 text-graphite">
              {review.feedback}
            </blockquote>
          ) : null}
          {review.decidedAt ? (
            <p className="mt-2 text-[12px] text-muted">
              {REVIEW_STATUS_LABEL[review.status]} by {review.decidedByName ?? 'the President'} /{' '}
              {formatDateTime(review.decidedAt)}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function EmailDialog({
  draft,
  postTitle,
  open,
  onClose,
  onMarkSent,
  markingSent,
}: {
  draft: PrepareReviewResponse | null
  postTitle: string
  open: boolean
  onClose: () => void
  onMarkSent: () => void
  markingSent: boolean
}) {
  const toast = useToast()
  if (!draft) return null

  const openGmail = () => {
    window.open(draft.gmailComposeUrl, '_blank', 'noopener,noreferrer')
    toast.info('Gmail opened in a new tab', 'Review the email, send it, then confirm below.')
  }

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(
        `To: ${draft.recipientEmail}\nSubject: ${draft.subject}\n\n${draft.body}`,
      )
      toast.success('Email content copied')
    } catch {
      toast.error('Could not copy the email')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Gmail review request"
      description={`Review request for “${postTitle}”. Send it from your own Gmail account.`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={copyDraft}>
            <Copy className="h-3.5 w-3.5" />
            Copy email
          </button>
          <button type="button" className="btn btn-secondary" onClick={openGmail}>
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Gmail
          </button>
          <button type="button" className="btn btn-primary" onClick={onMarkSent} disabled={markingSent}>
            {markingSent ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {markingSent ? 'Saving…' : 'I have sent it'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="border border-paper/50 bg-ink px-5 py-4">
          <p className="text-[13px] font-medium text-paper">Send the email first</p>
          <p className="mt-2 text-[13px] leading-6 text-muted">
            Only confirm “I have sent it” after Gmail has actually sent the message. This marks the
            post as in review for the President.
          </p>
        </div>

        <div className="border border-rule-strong">
          <div className="space-y-2.5 border-b border-rule px-5 py-4 text-[13px] leading-6 text-muted">
            <p>
              <span className="font-medium text-paper">To:</span> {draft.recipientEmail}
            </p>
            <p>
              <span className="font-medium text-paper">Subject:</span> {draft.subject}
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto px-5 py-5">
            <pre className="font-sans text-[13px] leading-7 whitespace-pre-wrap text-graphite">
              {draft.body}
            </pre>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CopyButton text={draft.reviewUrl} label="Copy review link" />
          <span className="text-[12px] text-muted">
            The President must sign in before approving.
          </span>
        </div>
      </div>
    </Modal>
  )
}

export default function PostDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const toast = useToast()
  const user = useCurrentUser()

  const [emailDraft, setEmailDraft] = useState<PrepareReviewResponse | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const [postedOpen, setPostedOpen] = useState(false)
  const [postedUrl, setPostedUrl] = useState('')
  const [postedError, setPostedError] = useState('')
  const [reopenOpen, setReopenOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const postQuery = useQuery({
    queryKey: ['post', id],
    queryFn: () => api.post(id!),
    enabled: Boolean(id),
  })

  const invalidate = (postId: string) => {
    queryClient.invalidateQueries({ queryKey: ['post', postId] })
    queryClient.invalidateQueries({ queryKey: ['posts'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const prepare = useMutation({
    mutationFn: (postId: string) => api.prepareReview(postId),
    onSuccess: (draft, postId) => {
      setEmailDraft(draft)
      setEmailOpen(true)
      invalidate(postId)
    },
    onError: (error) =>
      toast.error(
        'Could not prepare the review',
        error instanceof ApiError ? error.message : 'Please try again.',
      ),
  })

  const markSent = useMutation({
    mutationFn: (reviewId: string) => api.markReviewSent(reviewId),
    onSuccess: () => {
      setEmailOpen(false)
      setEmailDraft(null)
      if (id) invalidate(id)
      toast.success('Marked as sent', 'The post is now waiting for the President.')
    },
    onError: (error) =>
      toast.error(
        'Could not mark the email as sent',
        error instanceof ApiError ? error.message : 'Please try again.',
      ),
  })

  const markPosted = useMutation({
    mutationFn: ({ postId, url }: { postId: string; url: string }) => api.markPosted(postId, url),
    onSuccess: () => {
      setPostedOpen(false)
      setPostedUrl('')
      if (id) invalidate(id)
      toast.success('Post marked as posted', 'The tracker now shows this content as live.')
    },
    onError: (error) => {
      setPostedError(error instanceof ApiError ? error.message : 'Please try again.')
    },
  })

  const reopen = useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason: string }) =>
      api.reopenPost(postId, reason),
    onSuccess: () => {
      setReopenOpen(false)
      setReopenReason('')
      if (id) invalidate(id)
      toast.success('Post reopened', 'It is back in changes requested for another round.')
    },
    onError: (error) =>
      toast.error(
        'Could not reopen the post',
        error instanceof ApiError ? error.message : 'Please try again.',
      ),
  })

  const cancel = useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason: string }) =>
      api.cancelPost(postId, reason),
    onSuccess: () => {
      setCancelOpen(false)
      setCancelReason('')
      if (id) invalidate(id)
      toast.success('Post cancelled')
    },
    onError: (error) =>
      toast.error(
        'Could not cancel the post',
        error instanceof ApiError ? error.message : 'Please try again.',
      ),
  })

  if (postQuery.isLoading) return <LoadingState label="Loading the post…" />
  if (postQuery.isError) {
    const notFound = postQuery.error instanceof ApiError && postQuery.error.status === 404
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title={notFound ? 'Post not found' : 'Could not load this post'}
          message={
            notFound
              ? 'It may have been removed, or the link is incorrect.'
              : 'Please check your connection and try again.'
          }
          onRetry={notFound ? undefined : () => postQuery.refetch()}
        />
        <div className="mt-4 text-center">
          <Link to="/tracker" className="btn btn-secondary btn-sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to tracker
          </Link>
        </div>
      </div>
    )
  }

  const post = postQuery.data!
  const latestReview = post.reviews[0]
  const actionableReview = post.reviews.find(
    (review) => review.status === 'SENT' || review.status === 'PREPARED',
  )
  const editable =
    (post.status === 'DRAFT' || post.status === 'CHANGES_REQUESTED') &&
    (isAdmin(user) || post.createdBy.id === user?.id || post.assignee.id === user?.id)
  const canPrepare = editable
  const canMarkPosted = post.status === 'APPROVED' && (isAdmin(user) || post.assignee.id === user?.id)
  const canCancel = editable
  const admin = isAdmin(user)
  const requiresUrl = post.postType === 'POST' || post.postType === 'REEL'
  const pendingDraft = post.reviews.find((review) => review.status === 'PREPARED')

  const openPrepare = () => {
    prepare.mutate(post.id)
  }

  const submitPosted = () => {
    const value = postedUrl.trim()
    if (requiresUrl && !value) {
      setPostedError('A live URL is required for posts and reels.')
      return
    }
    if (value && !/^https?:\/\/.+/i.test(value)) {
      setPostedError('Enter a valid URL starting with http:// or https://.')
      return
    }
    setPostedError('')
    markPosted.mutate({ postId: post.id, url: value })
  }

  const statusHint: Record<PostDetail['status'], string> = {
    DRAFT: 'This draft is being prepared. Send a review request when it is ready.',
    IN_REVIEW: pendingDraft
      ? 'A review email was prepared but not yet confirmed as sent.'
      : 'The President is reviewing this post.',
    CHANGES_REQUESTED: 'The President asked for changes. Edit the post and send a new round.',
    APPROVED: 'Approved and locked. Mark it as posted once it goes live.',
    POSTED: 'This content is live and recorded in the tracker.',
    CANCELLED: 'This post was cancelled. It is kept for history, not deleted.',
  }

  return (
    <div>
      <Link to="/tracker" className="link-arrow">
        <ArrowLeft className="h-3.5 w-3.5" />
        Content tracker
      </Link>

      <div className="mt-8 border-t border-paper/70 pt-7">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-14">
          <div className="min-w-0 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={post.status} />
              <span className="badge">{POST_TYPE_LABEL[post.postType]}</span>
              <span className="text-[12px] text-muted">Round {post.reviewRound}</span>
            </div>
            <h1 className="mt-5 font-serif text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.94] tracking-[-0.03em]">
              {post.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-muted">
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                Planned for {formatDate(post.publishDate)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Avatar name={post.assignee.fullName} size="xs" />
                {post.assignee.fullName}
              </span>
              <PlatformPills platforms={post.platforms} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 lg:shrink-0">
            {editable ? (
              <Link to={`/posts/${post.id}/edit`} className="btn btn-secondary">
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            ) : null}
            {admin && actionableReview && (post.status === 'IN_REVIEW' || post.status === 'DRAFT') ? (
              <Link to={`/review/${actionableReview.id}`} className="btn btn-primary">
                <CheckCircle2 className="h-4 w-4" />
                Review as President
              </Link>
            ) : null}
            {canMarkPosted ? (
              <button type="button" className="btn btn-primary" onClick={() => setPostedOpen(true)}>
                <Send className="h-4 w-4" />
                Mark as posted
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-start gap-3.5 border-l-2 border-paper bg-surface px-5 py-4 text-[14px] leading-6 text-graphite">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-paper" aria-hidden="true" />
        <p className="flex-1">{statusHint[post.status]}</p>
        {post.status === 'POSTED' && post.postedAt ? (
          <span className="hidden shrink-0 pt-0.5 text-[12px] text-muted sm:block">
            {formatDateTime(post.postedAt)}
          </span>
        ) : null}
      </div>

      <div className="mt-12 grid gap-14 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-14">
          <Section
            title="Caption"
            action={
              <div className="flex items-center gap-4">
                <span className="text-[12px] text-muted">{post.caption.length} characters</span>
                <CopyButton text={post.caption} label="Copy caption" />
              </div>
            }
          >
            <div className="mt-5 border border-rule bg-surface p-6 sm:p-8">
              <p className="prose-caption">{post.caption}</p>
            </div>
          </Section>

          {post.notes ? (
            <Section title="Internal notes">
              <p className="mt-5 max-w-3xl border-l border-paper/40 pl-5 text-[14px] leading-7 whitespace-pre-wrap text-graphite">
                {post.notes}
              </p>
            </Section>
          ) : null}

          <Section title="Review history">
            <ReviewTimeline reviews={post.reviews} />
          </Section>

          <Section
            title="Activity"
            action={<span className="text-[12px] text-muted">{post.audit.length} events</span>}
          >
            <ul className="mt-5 divide-y divide-rule border-b border-rule">
              {post.audit.slice(0, 10).map((event) => (
                <li key={event.id} className="flex items-start gap-4 py-4">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-paper/70" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-graphite">
                      {ACTIVITY_LABEL[event.actionType] ?? event.actionType}
                    </p>
                    {event.details ? (
                      <p className="mt-1.5 text-[13px] leading-6 text-muted">{event.details}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-[12px] whitespace-nowrap text-muted">
                    {fromNow(event.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="space-y-14">
          <section className="border-t border-rule-strong pt-6 lg:sticky lg:top-28">
            <h2 className="section-title">Next step</h2>

            <div className="mt-6 space-y-2.5">
              {canPrepare ? (
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={openPrepare}
                  disabled={prepare.isPending}
                >
                  {prepare.isPending ? <Spinner className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  {pendingDraft ? 'Open review email' : 'Request review'}
                </button>
              ) : null}

              {post.status === 'IN_REVIEW' && pendingDraft ? (
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={openPrepare}
                  disabled={prepare.isPending}
                >
                  <Mail className="h-4 w-4" />
                  Open review email
                </button>
              ) : null}

              {canMarkPosted ? (
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={() => setPostedOpen(true)}
                >
                  <Send className="h-4 w-4" />
                  Mark as posted
                </button>
              ) : null}

              {admin && actionableReview && (post.status === 'IN_REVIEW' || post.status === 'DRAFT') ? (
                <Link to={`/review/${actionableReview.id}`} className="btn btn-secondary w-full">
                  <CheckCircle2 className="h-4 w-4" />
                  Open review page
                </Link>
              ) : null}

              {admin && post.status === 'APPROVED' ? (
                <button
                  type="button"
                  className="btn btn-secondary w-full"
                  onClick={() => setReopenOpen(true)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reopen for changes
                </button>
              ) : null}

              {canCancel ? (
                <button
                  type="button"
                  className="btn btn-ghost w-full"
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="h-4 w-4" />
                  Cancel post
                </button>
              ) : null}

              {!canPrepare &&
              !canMarkPosted &&
              !(admin && actionableReview) &&
              !(admin && post.status === 'APPROVED') &&
              post.status !== 'CANCELLED' ? (
                <p className="py-3 text-center text-[13px] leading-6 text-muted">
                  No actions available for you in this state.
                </p>
              ) : null}

              {post.status === 'CANCELLED' ? (
                <div className="border border-rule px-4 py-4 text-center text-[13px] text-muted">
                  This post is cancelled and read-only.
                </div>
              ) : null}
            </div>

            {post.status === 'IN_REVIEW' && !pendingDraft ? (
              <p className="mt-5 flex items-start gap-2.5 border-l border-paper/40 pl-4 text-[13px] leading-6 text-muted">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-paper" />
                Waiting for the President. You can still edit the review email in Gmail if you need
                to resend it.
              </p>
            ) : null}
          </section>

          <Section title="Publishing">
            <dl className="mt-6 space-y-5">
              <KeyValue label="Planned date">{formatDate(post.publishDate)}</KeyValue>
              <KeyValue label="Assignee">
                <span className="flex items-center gap-2.5">
                  <Avatar name={post.assignee.fullName} size="xs" />
                  <span>
                    {post.assignee.fullName}
                    <span className="mt-0.5 block text-[12px] text-muted">
                      {post.assignee.email}
                    </span>
                  </span>
                </span>
              </KeyValue>
              <KeyValue label="Created by">
                {post.createdBy.fullName}
                <span className="mt-0.5 block text-[12px] text-muted">
                  {formatDate(post.createdAt)}
                </span>
              </KeyValue>
              <KeyValue label="Platforms">
                <PlatformPills platforms={post.platforms} />
              </KeyValue>
              <KeyValue label="Drive assets">
                <a
                  href={post.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-arrow"
                >
                  <Link2 className="h-4 w-4" />
                  Open Google Drive
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </KeyValue>
              {post.postedUrl ? (
                <KeyValue label="Live link">
                  <a
                    href={post.postedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-arrow"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View posted content
                  </a>
                </KeyValue>
              ) : null}
            </dl>
          </Section>

          {latestReview ? (
            <Section
              title="Latest review"
              action={<ReviewStatusBadge status={latestReview.status} />}
            >
              <dl className="mt-6 space-y-4">
                <KeyValue label="Round">{latestReview.roundNumber}</KeyValue>
                <KeyValue label="Recipient">{latestReview.recipientEmail}</KeyValue>
                <KeyValue label="Prepared">{formatDateTime(latestReview.preparedAt)}</KeyValue>
                {latestReview.sentAt ? (
                  <KeyValue label="Marked sent">{formatDateTime(latestReview.sentAt)}</KeyValue>
                ) : null}
                {latestReview.feedback ? (
                  <KeyValue label="Feedback">
                    <span className="text-[14px] leading-7 whitespace-pre-wrap text-graphite">
                      {latestReview.feedback}
                    </span>
                  </KeyValue>
                ) : null}
              </dl>
            </Section>
          ) : null}
        </div>
      </div>

      <EmailDialog
        draft={emailDraft}
        postTitle={post.title}
        open={emailOpen}
        onClose={() => {
          setEmailOpen(false)
          setEmailDraft(null)
        }}
        onMarkSent={() => {
          if (emailDraft) markSent.mutate(emailDraft.reviewRequestId)
        }}
        markingSent={markSent.isPending}
      />

      <Modal
        open={postedOpen}
        onClose={() => {
          setPostedOpen(false)
          setPostedError('')
        }}
        title="Mark as posted"
        description={
          requiresUrl
            ? 'Paste the live URL so the tracker keeps a permanent record.'
            : 'Stories can be recorded without a live URL. Add a Drive proof link if helpful.'
        }
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setPostedOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitPosted}
              disabled={markPosted.isPending}
            >
              {markPosted.isPending ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              {markPosted.isPending ? 'Saving…' : 'Confirm posted'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="border border-rule bg-ink px-5 py-4 text-[13px] leading-6 text-muted">
            Posting and scheduling are manual. Use this only after the content is actually live on{' '}
            {post.platforms.map((platform) => PLATFORM_LABEL[platform]).join(', ')}.
          </div>
          <div>
            <label className="label" htmlFor="posted-url">
              Live URL {requiresUrl ? <span className="text-paper">*</span> : '(optional)'}
            </label>
            <input
              id="posted-url"
              className="input"
              placeholder="https://www.instagram.com/p/..."
              value={postedUrl}
              onChange={(event) => {
                setPostedUrl(event.target.value)
                setPostedError('')
              }}
            />
            {postedError ? <p className="field-error">{postedError}</p> : null}
            <p className="hint">
              {requiresUrl
                ? 'Required for posts and reels.'
                : 'For stories, a Drive screenshot or proof link works too.'}
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        title="Reopen this approved post"
        description="The post returns to changes requested so the team can make another review round."
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setReopenOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => reopen.mutate({ postId: post.id, reason: reopenReason })}
              disabled={!reopenReason.trim() || reopen.isPending}
            >
              {reopen.isPending ? <Spinner className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Reopen post
            </button>
          </>
        }
      >
        <label className="label" htmlFor="reopen-reason">
          Why is this being reopened?
        </label>
        <textarea
          id="reopen-reason"
          rows={4}
          className="input resize-y"
          value={reopenReason}
          onChange={(event) => setReopenReason(event.target.value)}
          placeholder="e.g. The event date changed and the caption needs an update."
        />
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this post"
        description="Cancelled posts stay in the tracker and Excel history. They are not deleted."
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCancelOpen(false)}>
              Keep post
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => cancel.mutate({ postId: post.id, reason: cancelReason })}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? <Spinner className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              Cancel post
            </button>
          </>
        }
      >
        <label className="label" htmlFor="cancel-reason">
          Reason <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="cancel-reason"
          rows={3}
          className="input resize-y"
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          placeholder="e.g. The event was postponed."
        />
      </Modal>
    </div>
  )
}
