import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Link2,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useCurrentUser } from '../lib/auth'
import { formatDate, formatDateTime, POST_TYPE_LABEL } from '../lib/format'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { Avatar, KeyValue, LoadingState, Section, Spinner } from '../components/ui'
import { PlatformPills } from '../components/PlatformPills'
import { ReviewStatusBadge, StatusBadge } from '../components/StatusBadge'

export default function ReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const user = useCurrentUser()

  const [feedback, setFeedback] = useState('')
  const [feedbackError, setFeedbackError] = useState('')
  const [approveOpen, setApproveOpen] = useState(false)

  const reviewQuery = useQuery({
    queryKey: ['review', id],
    queryFn: () => api.review(id!),
    enabled: Boolean(id),
  })

  const invalidate = (postId: string) => {
    queryClient.invalidateQueries({ queryKey: ['post', postId] })
    queryClient.invalidateQueries({ queryKey: ['review', id] })
    queryClient.invalidateQueries({ queryKey: ['posts'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const approve = useMutation({
    mutationFn: ({ reviewId, text }: { reviewId: string; text: string }) =>
      api.approveReview(reviewId, text),
    onSuccess: (post) => {
      setApproveOpen(false)
      invalidate(post.id)
      toast.success('Post approved', 'The assignee can now mark it as posted.')
      navigate(`/posts/${post.id}`)
    },
    onError: (error) =>
      toast.error(
        'Could not approve the post',
        error instanceof ApiError ? error.message : 'Please try again.',
      ),
  })

  const requestChanges = useMutation({
    mutationFn: ({ reviewId, text }: { reviewId: string; text: string }) =>
      api.requestChanges(reviewId, text),
    onSuccess: (post) => {
      invalidate(post.id)
      toast.success('Changes requested', 'The team can edit and send a new review round.')
      navigate(`/posts/${post.id}`)
    },
    onError: (error) =>
      toast.error(
        'Could not request changes',
        error instanceof ApiError ? error.message : 'Please try again.',
      ),
  })

  if (reviewQuery.isLoading) return <LoadingState label="Opening the review…" />

  if (reviewQuery.isError) {
    const error = reviewQuery.error
    const forbidden = error instanceof ApiError && error.status === 403
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <div className="mx-auto max-w-xl">
        <div className="border border-rule-strong bg-surface px-6 py-16 text-center sm:px-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center border border-paper text-paper">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <h1 className="mt-6 font-sans text-3xl leading-tight font-medium tracking-[-0.02em]">
            {forbidden
              ? 'Only the President can review'
              : notFound
                ? 'Review not found'
                : 'Could not open the review'}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[14px] leading-7 text-muted">
            {forbidden
              ? 'Review decisions are restricted to the Super Admin account. You can still view the post in the content tracker.'
              : notFound
                ? 'The review link may be outdated, or the post was cancelled.'
                : 'Please check your connection and try again.'}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            <Link to="/tracker" className="btn btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to tracker
            </Link>
            {!forbidden && !notFound ? (
              <button type="button" className="btn btn-primary" onClick={() => reviewQuery.refetch()}>
                Try again
              </button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  const { post, review } = reviewQuery.data!
  const actionable =
    (review.status === 'PREPARED' || review.status === 'SENT') &&
    (post.status === 'DRAFT' || post.status === 'IN_REVIEW')
  const isPrepared = review.status === 'PREPARED'

  const submitApprove = () => {
    approve.mutate({ reviewId: review.id, text: feedback })
  }

  const submitChanges = () => {
    if (!feedback.trim()) {
      setFeedbackError('Write the changes that are needed before requesting them.')
      return
    }
    setFeedbackError('')
    requestChanges.mutate({ reviewId: review.id, text: feedback.trim() })
  }

  return (
    <div>
      <Link to={`/posts/${post.id}`} className="link-arrow">
        <ArrowLeft className="h-4 w-4" />
        Back to post
      </Link>

      <div className="mt-8 border-t border-rule pt-9">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="min-w-0 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="badge border-paper text-paper">
                <ShieldCheck className="h-3.5 w-3.5" />
                President review
              </span>
              <StatusBadge status={post.status} />
              <ReviewStatusBadge status={review.status} />
              <span className="text-[12px] text-muted">Round {review.roundNumber}</span>
            </div>
            <h1 className="mt-6 font-serif text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.94] tracking-[-0.03em]">
              {post.title}
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-muted">
              {POST_TYPE_LABEL[post.postType]} / planned for {formatDate(post.publishDate)} / assigned to {post.assignee.fullName}
            </p>
            <div className="mt-5">
              <PlatformPills platforms={post.platforms} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-14 grid gap-16 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-16">
          <Section
            title="Caption"
            action={
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(post.caption)
                    toast.success('Caption copied')
                  } catch {
                    toast.error('Could not copy the caption')
                  }
                }}
              >
                Copy
              </button>
            }
          >
            <div className="mt-6 border border-rule bg-surface p-6 sm:p-8">
              <p className="prose-caption">{post.caption}</p>
            </div>
          </Section>

          {post.notes ? (
            <Section title="Notes from the team">
              <p className="mt-6 max-w-3xl border-l border-paper/40 pl-5 text-[14px] leading-7 whitespace-pre-wrap text-graphite">
                {post.notes}
              </p>
            </Section>
          ) : null}

          <Section title="Production details">
            <dl className="mt-6 grid gap-6 border-b border-rule pb-7 sm:grid-cols-2">
              <KeyValue label="Type">{POST_TYPE_LABEL[post.postType]}</KeyValue>
              <KeyValue label="Planned date">{formatDate(post.publishDate)}</KeyValue>
              <KeyValue label="Assignee">
                <span className="flex items-center gap-2.5">
                  <Avatar name={post.assignee.fullName} size="xs" />
                  {post.assignee.fullName}
                </span>
              </KeyValue>
              <KeyValue label="Created by">{post.createdBy.fullName}</KeyValue>
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
              <KeyValue label="Requested by">
                {review.requestedByName ?? 'Team member'}
                <span className="mt-1.5 block text-[12px] text-muted">
                  {formatDateTime(review.preparedAt)}
                </span>
              </KeyValue>
            </dl>
          </Section>

          {post.reviews.length > 1 ? (
            <Section
              title="Earlier rounds"
              action={<span className="text-[12px] text-muted">{post.reviews.length - 1} previous</span>}
            >
              <ul className="mt-6 border-b border-rule">
                {post.reviews
                  .filter((item) => item.id !== review.id)
                  .map((item) => (
                    <li key={item.id} className="border-t border-rule py-6 first:border-t-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[15px] leading-none font-medium">
                          Round {item.roundNumber}
                        </span>
                        <ReviewStatusBadge status={item.status} />
                        <span className="text-[12px] text-muted">
                          {formatDateTime(item.decidedAt ?? item.preparedAt)}
                        </span>
                      </div>
                      {item.feedback ? (
                        <p className="mt-4 border-l border-paper/40 pl-4 text-[14px] leading-7 text-graphite">
                          {item.feedback}
                        </p>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </Section>
          ) : null}
        </div>

        <div>
          <section className="border border-paper p-6 lg:sticky lg:top-28 sm:p-7">
            <h2 className="section-title">Your decision</h2>
            <p className="mt-4 text-[13px] leading-6 text-muted">
              {actionable
                ? 'Approving locks the post. Requesting changes sends it back to the team.'
                : 'This review round is already closed.'}
            </p>

            <div className="mt-7 space-y-3 border-y border-rule py-6">
              <div className="flex items-start justify-between gap-5 text-[13px]">
                <span className="text-muted">Recipient</span>
                <span className="max-w-[220px] text-right break-all text-graphite">
                  {review.recipientEmail}
                </span>
              </div>
              <div className="flex items-start justify-between gap-5 text-[13px]">
                <span className="text-muted">Prepared</span>
                <span className="text-right text-graphite">{formatDateTime(review.preparedAt)}</span>
              </div>
              <div className="flex items-start justify-between gap-5 text-[13px]">
                <span className="text-muted">Marked sent</span>
                <span className="text-right text-graphite">
                  {review.sentAt ? formatDateTime(review.sentAt) : 'Not yet'}
                </span>
              </div>
            </div>

            {isPrepared && actionable ? (
              <div className="mt-6 flex items-start gap-3 border-l-2 border-paper pl-4 text-[13px] leading-6 text-muted">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-paper" />
                The sender has not marked the email as sent. Your decision will record it as sent
                automatically.
              </div>
            ) : null}

            {actionable ? (
              <>
                <div className="mt-6">
                  <label className="label" htmlFor="review-feedback">
                    Feedback
                    {!isPrepared ? (
                      <span className="ml-1 font-normal text-muted">(required to request changes)</span>
                    ) : null}
                  </label>
                  <textarea
                    id="review-feedback"
                    rows={6}
                    className="input resize-y"
                    placeholder="Share what works and what needs to change. This is saved in the review history and the Excel backup."
                    value={feedback}
                    onChange={(event) => {
                      setFeedback(event.target.value)
                      if (feedbackError) setFeedbackError('')
                    }}
                  />
                  {feedbackError ? <p className="field-error">{feedbackError}</p> : null}
                </div>

                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={() => setApproveOpen(true)}
                    disabled={approve.isPending || requestChanges.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve post
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger w-full"
                    onClick={submitChanges}
                    disabled={approve.isPending || requestChanges.isPending}
                  >
                    {requestChanges.isPending ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Request changes
                  </button>
                </div>

                <p className="mt-6 text-center text-[13px] leading-6 text-muted">
                  Decisions are attributed to {user?.fullName ?? 'you'} and shown in the post history.
                </p>
              </>
            ) : (
              <div className="mt-6">
                <div className="border border-rule bg-ink p-6">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <ReviewStatusBadge status={review.status} />
                    <span className="text-[13px] text-muted">
                      {review.decidedAt ? formatDateTime(review.decidedAt) : 'Closed'}
                    </span>
                  </div>
                  {review.feedback ? (
                    <p className="mt-5 text-[14px] leading-7 whitespace-pre-wrap text-graphite">
                      {review.feedback}
                    </p>
                  ) : (
                    <p className="mt-4 text-[13px] text-muted">No written feedback was recorded.</p>
                  )}
                </div>
                <Link to={`/posts/${post.id}`} className="btn btn-secondary mt-6 w-full">
                  View the post
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>

      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve this post?"
        description="Approval locks editing. The assignee will be able to mark it as posted."
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setApproveOpen(false)}>
              Not yet
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitApprove}
              disabled={approve.isPending}
            >
              {approve.isPending ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {approve.isPending ? 'Approving…' : 'Yes, approve post'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="border border-rule bg-ink px-6 py-5">
            <p className="text-[15px] leading-tight text-paper">{post.title}</p>
            <p className="mt-2 text-[13px] text-muted">
              {POST_TYPE_LABEL[post.postType]} / {formatDate(post.publishDate)} /{' '}
              {post.assignee.fullName}
            </p>
          </div>
          {feedback.trim() ? (
            <div>
              <p className="label">Feedback that will be recorded</p>
              <p className="border-l border-paper/40 pl-4 text-[14px] leading-7 whitespace-pre-wrap text-graphite">
                {feedback.trim()}
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-muted">No feedback will be recorded with this approval.</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
