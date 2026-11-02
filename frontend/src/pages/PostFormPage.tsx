import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  ArrowLeft,
  CalendarDays,
  Info,
  Link2,
  LockKeyhole,
  Save,
  Send,
  UserRound,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { isAdmin, useCurrentUser } from '../lib/auth'
import { toDateInputValue } from '../lib/format'
import type { Platform, PostType } from '../lib/types'
import { useToast } from '../components/Toast'
import { ErrorState, LoadingState, PageHeader, Section, Spinner } from '../components/ui'
import { StatusBadge } from '../components/StatusBadge'

const PLATFORM_OPTIONS: { value: Platform; label: string; description: string }[] = [
  { value: 'INSTAGRAM', label: 'Instagram', description: 'Feed, reels and stories' },
  { value: 'FACEBOOK', label: 'Facebook', description: 'Page posts and reels' },
  { value: 'LINKEDIN', label: 'LinkedIn', description: 'Professional audience' },
]

const TYPE_OPTIONS: { value: PostType; label: string; description: string }[] = [
  { value: 'POST', label: 'Post', description: 'Image or carousel' },
  { value: 'REEL', label: 'Reel', description: 'Short vertical video' },
  { value: 'STORY', label: 'Story', description: 'Disappears after 24h' },
  { value: 'OTHER', label: 'Other', description: 'Anything else' },
]

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the post a clear name.')
    .max(180, 'Keep the name under 180 characters.'),
  postType: z.enum(['POST', 'REEL', 'STORY', 'OTHER']),
  platforms: z
    .array(z.enum(['INSTAGRAM', 'FACEBOOK', 'LINKEDIN']))
    .min(1, 'Choose at least one platform.'),
  publishDate: z.string().min(1, 'Choose a planned publish date.'),
  assigneeId: z.string().min(1, 'Choose an assignee.'),
  driveUrl: z
    .string()
    .trim()
    .min(1, 'Paste the Google Drive link.')
    .url('Enter a valid link, starting with https://')
    .regex(/^https?:\/\//i, 'The link must start with http:// or https://.'),
  caption: z
    .string()
    .trim()
    .min(1, 'Write the caption that will be published.')
    .max(10000, 'Keep the caption under 10,000 characters.'),
  notes: z.string().max(2000, 'Keep notes under 2,000 characters.').optional(),
})

type FormValues = z.infer<typeof schema>

export default function PostFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const user = useCurrentUser()

  const postQuery = useQuery({
    queryKey: ['post', id],
    queryFn: () => api.post(id!),
    enabled: isEdit,
  })

  const users = useQuery({
    queryKey: ['userOptions'],
    queryFn: api.userOptions,
    staleTime: 5 * 60 * 1000,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      postType: 'POST',
      platforms: ['INSTAGRAM'],
      publishDate: params.get('date') ?? format(new Date(), 'yyyy-MM-dd'),
      assigneeId: '',
      driveUrl: '',
      caption: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (postQuery.data) {
      const post = postQuery.data
      reset({
        title: post.title,
        postType: post.postType,
        platforms: post.platforms,
        publishDate: toDateInputValue(post.publishDate),
        assigneeId: post.assignee.id,
        driveUrl: post.driveUrl,
        caption: post.caption,
        notes: post.notes ?? '',
      })
    }
  }, [postQuery.data, reset])

  const assigneeDefaulted = useRef(false)

  useEffect(() => {
    if (isEdit || !user?.id || assigneeDefaulted.current) return
    const loaded = users.data?.some((option) => option.id === user.id)
    if (!loaded) return
    if (!getValues('assigneeId')) {
      setValue('assigneeId', user.id, { shouldDirty: false })
    }
    assigneeDefaulted.current = true
  }, [isEdit, user?.id, users.data, getValues, setValue])

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit ? api.updatePost(id!, values) : api.createPost(values),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['post', post.id] })
      toast.success(isEdit ? 'Post updated' : 'Draft created', 'The tracker is up to date.')
      navigate(`/posts/${post.id}`)
    },
    onError: (error) => {
      const message =
        error instanceof ApiError ? error.message : 'Could not save this post. Please try again.'
      toast.error('Save failed', message)
    },
  })

  if (isEdit && postQuery.isLoading) return <LoadingState label="Loading the post…" />
  if (isEdit && postQuery.isError) {
    return (
      <ErrorState
        message="This post could not be loaded."
        onRetry={() => postQuery.refetch()}
      />
    )
  }

  const post = postQuery.data
  if (post) {
    const canEdit =
      isAdmin(user) ||
      post.createdBy.id === user?.id ||
      post.assignee.id === user?.id
    const editable = post.status === 'DRAFT' || post.status === 'CHANGES_REQUESTED'

    if (!canEdit || !editable) {
      return (
        <div className="mx-auto max-w-2xl">
          <PageHeader eyebrow="Edit post" title="This post cannot be edited" />
          <div className="border border-rule-strong bg-surface px-6 py-16 text-center sm:px-10">
            <span className="mx-auto flex h-14 w-14 items-center justify-center border border-paper text-paper">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <h2 className="mt-6 font-sans text-2xl leading-tight font-medium tracking-[-0.02em]">
              {editable ? 'You do not have edit access' : 'The post is already in motion'}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-7 text-muted">
              {editable
                ? 'Only the creator, the assignee or the Super Admin can edit this post.'
                : 'Approved and posted content is locked to keep the review history trustworthy. Reopen it from the post page if something must change.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <StatusBadge status={post.status} />
              <Link to={`/posts/${post.id}`} className="btn btn-secondary btn-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to post
              </Link>
            </div>
          </div>
        </div>
      )
    }
  }

  const caption = watch('caption') ?? ''
  const title = watch('title') ?? ''

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow={isEdit ? 'Edit content' : 'New content'}
        title={isEdit ? 'Edit post' : 'Create a post'}
        description={
          isEdit
            ? 'Update the details, then prepare a new review round if needed.'
            : 'Start with a draft. The review email is prepared as a separate step.'
        }
        actions={
          <Link to={isEdit && post ? `/posts/${post.id}` : '/tracker'} className="btn btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Link>
        }
      />

      {isEdit && post ? (
        <div className="mb-10 flex flex-wrap items-center gap-4 border border-rule bg-surface px-5 py-4">
          <StatusBadge status={post.status} />
          <span className="text-[13px] text-muted">
            Round {post.reviewRound} / created by {post.createdBy.fullName}
          </span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
        <div className="grid gap-14 lg:grid-cols-[1fr_340px]">
          <div className="space-y-14">
            <Section title="The content">
              <div className="mt-7 space-y-8">
                <div>
                  <label className="label" htmlFor="title">
                    Post name
                  </label>
                  <input
                    id="title"
                    className="input"
                    placeholder="e.g. Founders' Day countdown — reel 2"
                    maxLength={180}
                    {...register('title')}
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    {errors.title ? (
                      <p className="field-error mt-0">{errors.title.message}</p>
                    ) : (
                      <p className="hint mt-0">A short internal name, not the caption.</p>
                    )}
                    <span className="shrink-0 text-[12px] text-muted">{title.length}/180</span>
                  </div>
                </div>

                <div>
                  <span className="label">Post type</span>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {TYPE_OPTIONS.map((option) => (
                      <label key={option.value} className="choice">
                        <input
                          type="radio"
                          value={option.value}
                          className="sr-only"
                          {...register('postType')}
                        />
                        <span className="choice-title">{option.label}</span>
                        <span className="choice-desc">{option.description}</span>
                      </label>
                    ))}
                  </div>
                  {errors.postType ? <p className="field-error">{errors.postType.message}</p> : null}
                </div>

                <div>
                  <span className="label">Platforms</span>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {PLATFORM_OPTIONS.map((option) => (
                      <label key={option.value} className="choice">
                        <input
                          type="checkbox"
                          value={option.value}
                          className="sr-only"
                          {...register('platforms')}
                        />
                        <span className="choice-title">{option.label}</span>
                        <span className="choice-desc">{option.description}</span>
                      </label>
                    ))}
                  </div>
                  {errors.platforms ? (
                    <p className="field-error">{errors.platforms.message}</p>
                  ) : (
                    <p className="hint">Choose every platform this content will be posted on.</p>
                  )}
                </div>

                <div>
                  <label className="label" htmlFor="driveUrl">
                    Google Drive link
                  </label>
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="driveUrl"
                      className="input pl-11"
                      placeholder="https://drive.google.com/..."
                      {...register('driveUrl')}
                    />
                  </div>
                  {errors.driveUrl ? (
                    <p className="field-error">{errors.driveUrl.message}</p>
                  ) : (
                    <p className="hint">
                      Assets stay in Google Drive. This app never uploads files.
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="label mb-0" htmlFor="caption">
                      Caption
                    </label>
                    <span className="text-[12px] text-muted">{caption.length}/10,000</span>
                  </div>
                  <textarea
                    id="caption"
                    rows={8}
                    className="input mt-2.5 resize-y font-normal"
                    placeholder="Write the caption exactly as it should be published, including hashtags…"
                    {...register('caption')}
                  />
                  {errors.caption ? (
                    <p className="field-error">{errors.caption.message}</p>
                  ) : (
                    <p className="hint">
                      The assignee can copy this with one click from the post page.
                    </p>
                  )}
                </div>

                <div>
                  <label className="label" htmlFor="notes">
                    Internal notes <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    rows={4}
                    className="input resize-y"
                    placeholder="Production reminders, references, approvals from other stakeholders…"
                    {...register('notes')}
                  />
                  {errors.notes ? <p className="field-error">{errors.notes.message}</p> : null}
                </div>
              </div>
            </Section>
          </div>

          <div className="space-y-12">
            <Section title="Publishing details">
              <div className="mt-6 space-y-6">
                <div>
                  <label className="label" htmlFor="publishDate">
                    Planned publish date
                  </label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="publishDate"
                      type="date"
                      className="input pl-11"
                      {...register('publishDate')}
                    />
                  </div>
                  {errors.publishDate ? (
                    <p className="field-error">{errors.publishDate.message}</p>
                  ) : null}
                </div>

                <div>
                  <label className="label" htmlFor="assigneeId">
                    Assignee
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted" />
                    <select id="assigneeId" className="input pl-11" {...register('assigneeId')}>
                      <option value="">Choose a team member</option>
                      {(users.data ?? []).map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.assigneeId ? (
                    <p className="field-error">{errors.assigneeId.message}</p>
                  ) : (
                    <p className="hint">The assignee can prepare the review and mark it posted.</p>
                  )}
                </div>
              </div>
            </Section>

            <section className="border border-paper/50 bg-surface p-6">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-paper" />
                <div>
                  <p className="text-[13px] font-medium text-paper">What happens next?</p>
                  <ol className="mt-4 space-y-2.5 text-[13px] leading-6 text-muted">
                    <li>01 — Save the draft.</li>
                    <li>02 — Open the post and prepare a Gmail review request.</li>
                    <li>03 — Send the email, then mark it sent in the app.</li>
                    <li>04 — The President approves or asks for changes.</li>
                  </ol>
                </div>
              </div>
            </section>

            <section className="flex items-start gap-3 border-t border-rule pt-6 text-[13px] leading-6 text-muted">
              <Send className="mt-0.5 h-4 w-4 shrink-0" />
              Posting and scheduling remain manual. This app tracks the workflow, not the platforms.
            </section>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 mt-16 border-t border-paper/60 bg-ink py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="hidden text-[12px] text-muted sm:block">
              {isDirty ? 'Unsaved changes' : isEdit ? 'All changes saved' : 'New draft'}
            </p>
            <div className="flex flex-1 items-center justify-end gap-2.5 sm:flex-none">
              <Link
                to={isEdit && post ? `/posts/${post.id}` : '/tracker'}
                className="btn btn-secondary"
              >
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={save.isPending}>
                {save.isPending ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Save draft'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
