import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useCurrentUser } from '../lib/auth'
import { formatDate } from '../lib/format'
import { useToast } from '../components/Toast'
import { Avatar, KeyValue, PageHeader, Section, Spinner } from '../components/ui'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .max(100, 'Keep the password under 100 characters.'),
    confirmPassword: z.string().min(1, 'Confirm the new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'The new passwords do not match.',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export default function ProfilePage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const changePassword = useMutation({
    mutationFn: (values: FormValues) =>
      api.changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      reset()
      queryClient.clear()
      toast.success('Password changed', 'Please sign in again with your new password.')
      navigate('/login?changed=1', { replace: true })
    },
    onError: (error) => {
      toast.error(
        'Could not change your password',
        error instanceof ApiError ? error.message : 'Please try again.',
      )
    },
  })

  if (!user) return null

  const isSuperAdmin = user.role === 'SUPER_ADMIN'

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="Your account details and password for the SPECANCIENS Social Desk."
      />

      {user.mustChangePassword ? (
        <div className="mb-10 flex items-start gap-3.5 border border-paper/60 bg-surface px-5 py-4">
          <span className="mt-0.5 text-[13px] leading-none text-paper" aria-hidden="true">
            !
          </span>
          <p className="text-[14px] leading-6 text-graphite">
            Your account is using a temporary password. Please choose a new one below.
          </p>
        </div>
      ) : null}

      <div className="grid gap-14 lg:grid-cols-[320px_1fr]">
        <section className="border-t border-rule-strong pt-6">
          <div className="flex flex-col items-start">
            <Avatar name={user.fullName} size="lg" />
            <h2 className="mt-5 font-sans text-3xl leading-tight font-medium tracking-[-0.025em]">
              {user.fullName}
            </h2>
            <p className="mt-2 text-[13px] break-all text-muted">{user.email}</p>
            <span
              className={`badge mt-4 ${
                isSuperAdmin ? 'border-paper text-paper' : 'border-dashed border-rule-strong text-graphite'
              }`}
            >
              {isSuperAdmin ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <UserRound className="h-3.5 w-3.5" />
              )}
              {isSuperAdmin ? 'Super Admin' : 'Member'}
            </span>
          </div>

          <dl className="mt-8 space-y-5 border-t border-rule pt-7">
            <KeyValue label="Member since">{formatDate(user.createdAt)}</KeyValue>
            <KeyValue label="Last sign in">
              {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'This is your first session'}
            </KeyValue>
            <KeyValue label="Account status">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="text-[12px] leading-none text-paper">
                  {user.active ? '■' : '□'}
                </span>
                {user.active ? 'Active' : 'Inactive'}
              </span>
            </KeyValue>
          </dl>

          <div className="mt-8 border-t border-rule pt-6">
            <Link to="/tracker" className="btn btn-secondary w-full">
              Open content tracker
            </Link>
          </div>
        </section>

        <div className="space-y-14">
          <Section title="Change password">
            <div className="mt-6 flex items-center gap-2.5 text-muted">
              <KeyRound className="h-4 w-4" />
              <p className="text-[13px] leading-6">
                You will be signed out everywhere after changing your password.
              </p>
            </div>

            <form
              className="mt-7 space-y-6"
              onSubmit={handleSubmit((values) => changePassword.mutate(values))}
              noValidate
            >
              <div>
                <label className="label" htmlFor="currentPassword">
                  Current password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  className="input"
                  {...register('currentPassword')}
                />
                {errors.currentPassword ? (
                  <p className="field-error">{errors.currentPassword.message}</p>
                ) : null}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="newPassword">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    className="input"
                    {...register('newPassword')}
                  />
                  {errors.newPassword ? (
                    <p className="field-error">{errors.newPassword.message}</p>
                  ) : (
                    <p className="hint">At least 8 characters.</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="confirmPassword">
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="input"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword ? (
                    <p className="field-error">{errors.confirmPassword.message}</p>
                  ) : null}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={changePassword.isPending}>
                {changePassword.isPending ? <Spinner className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                {changePassword.isPending ? 'Saving…' : 'Change password'}
              </button>
            </form>
          </Section>

          <Section title="A private workspace">
            <div className="mt-6 flex items-start gap-3">
              <LogOut className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              <p className="text-[14px] leading-7 text-muted">
                Accounts are managed by the Super Admin. If you need a new team member added or a
                password reset, contact the President. There is no public registration.
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
