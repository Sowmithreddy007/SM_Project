import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  KeyRound,
  MailPlus,
  Pencil,
  ShieldCheck,
  UserRound,
  Users as UsersIcon,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useCurrentUser } from '../lib/auth'
import { formatDateTime, fromNow } from '../lib/format'
import type { Role, User } from '../lib/types'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { Avatar, EmptyState, ErrorState, LoadingState, PageHeader, Section, Spinner } from '../components/ui'

type Dialog =
  | { type: 'add' }
  | { type: 'edit'; user: User }
  | { type: 'reset'; user: User }
  | null

function RoleBadge({ role }: { role: Role }) {
  return role === 'SUPER_ADMIN' ? (
    <span className="badge border-paper text-paper">
      <ShieldCheck className="h-3 w-3" />
      Super Admin
    </span>
  ) : (
    <span className="badge border-dashed border-rule-strong text-graphite">
      <UserRound className="h-3 w-3" />
      Member
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="badge border-paper text-paper">
      <span aria-hidden="true" className="text-[11px] leading-none">
        ■
      </span>
      Active
    </span>
  ) : (
    <span className="badge border-dashed border-rule text-muted">
      <span aria-hidden="true" className="text-[11px] leading-none">
        □
      </span>
      Inactive
    </span>
  )
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-cell">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-6 font-sans text-5xl leading-none font-medium tracking-[-0.04em] tabular-nums">
        {value}
      </p>
    </div>
  )
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const currentUser = useCurrentUser()

  const [dialog, setDialog] = useState<Dialog>(null)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<Role>('MEMBER')
  const [active, setActive] = useState(true)

  const users = useQuery({ queryKey: ['users'], queryFn: api.users })

  const close = () => {
    setDialog(null)
    setError('')
    setFullName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setRole('MEMBER')
    setActive(true)
  }

  const openAdd = () => {
    close()
    setDialog({ type: 'add' })
  }

  const openEdit = (user: User) => {
    close()
    setFullName(user.fullName)
    setRole(user.role)
    setActive(user.active)
    setDialog({ type: 'edit', user })
  }

  const openReset = (user: User) => {
    close()
    setDialog({ type: 'reset', user })
  }

  const create = useMutation({
    mutationFn: () => api.createUser({ fullName: fullName.trim(), email: email.trim(), password, role }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['userOptions'] })
      toast.success('Team member added', `${created.fullName} can now sign in.`)
      close()
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })

  const update = useMutation({
    mutationFn: (user: User) =>
      api.updateUser(user.id, { fullName: fullName.trim(), role, active }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['userOptions'] })
      toast.success('Account updated', `${updated.fullName}'s details were saved.`)
      close()
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })

  const reset = useMutation({
    mutationFn: (user: User) => api.resetPassword(user.id, password),
    onSuccess: (_, user) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Password reset', `Share the temporary password with ${user.fullName}.`)
      close()
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })

  const submitAdd = () => {
    setError('')
    if (!fullName.trim()) return setError('Enter the full name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.')
    if (password.length < 8) return setError('Use a password with at least 8 characters.')
    create.mutate()
  }

  const submitEdit = () => {
    if (!dialog || dialog.type !== 'edit') return
    setError('')
    if (!fullName.trim()) return setError('Enter the full name.')
    update.mutate(dialog.user)
  }

  const submitReset = () => {
    if (!dialog || dialog.type !== 'reset') return
    setError('')
    if (password.length < 8) return setError('Use a password with at least 8 characters.')
    if (password !== confirmPassword) return setError('The two passwords do not match.')
    reset.mutate(dialog.user)
  }

  const data = users.data ?? []
  const activeCount = data.filter((user) => user.active).length
  const adminCount = data.filter((user) => user.role === 'SUPER_ADMIN').length

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Team"
        description="Create accounts for the social media team, manage roles, and reset passwords. There is no public sign-up."
        actions={
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <MailPlus className="h-4 w-4" />
            Add team member
          </button>
        }
      />

      <div className="grid gap-px border-y border-rule bg-rule sm:grid-cols-3">
        <StatCell label="Total accounts" value={data.length} />
        <StatCell label="Active" value={activeCount} />
        <StatCell label="Super Admins" value={adminCount} />
      </div>

      <Section
        title="Accounts"
        description="Deactivated members cannot sign in but remain in the post history."
        action={<span className="text-[12px] text-muted">{data.length} total</span>}
        className="mt-16"
      >
        {users.isLoading ? <LoadingState label="Loading the team…" /> : null}
        {users.isError ? (
          <div className="pt-8">
            <ErrorState message="The team list could not be loaded." onRetry={() => users.refetch()} />
          </div>
        ) : null}

        {users.isSuccess ? (
          data.length === 0 ? (
            <div className="border-b border-rule">
              <EmptyState icon={<UsersIcon className="h-5 w-5" />} title="No accounts yet" />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="mt-7 w-full border-collapse">
                  <thead className="table-head">
                    <tr>
                      <th>Member</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last sign in</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((user) => (
                      <tr key={user.id} className="table-row">
                        <td>
                          <span className="flex items-center gap-3.5">
                            <Avatar name={user.fullName} size="sm" />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2 text-[15px] font-medium text-paper">
                                {user.fullName}
                                {user.id === currentUser?.id ? (
                                  <span className="text-[12px] font-normal text-muted">(You)</span>
                                ) : null}
                              </span>
                              <span className="mt-1 block text-[13px] text-muted">
                                {user.email}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td>
                          <RoleBadge role={user.role} />
                        </td>
                        <td>
                          <StatusBadge active={user.active} />
                          {user.mustChangePassword ? (
                            <span className="mt-2 block text-[12px] text-muted">
                              Password change pending
                            </span>
                          ) : null}
                        </td>
                        <td className="text-[13px] whitespace-nowrap text-graphite">
                          {user.lastLoginAt ? (
                            <>
                              {fromNow(user.lastLoginAt)}
                              <span className="mt-1 block text-[12px] text-muted">
                                {formatDateTime(user.lastLoginAt)}
                              </span>
                            </>
                          ) : (
                            'Never'
                          )}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEdit(user)}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => openReset(user)}
                            >
                              <KeyRound className="h-4 w-4" />
                              Reset
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-rule border-b border-rule md:hidden">
                {data.map((user) => (
                  <div key={user.id} className="py-6">
                    <div className="flex items-start gap-4">
                      <Avatar name={user.fullName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-paper">
                          {user.fullName}
                          {user.id === currentUser?.id ? (
                            <span className="ml-2 text-[12px] font-normal text-muted">(You)</span>
                          ) : null}
                        </p>
                        <p className="mt-1 truncate text-[13px] text-muted">{user.email}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <RoleBadge role={user.role} />
                          <StatusBadge active={user.active} />
                        </div>
                        <p className="mt-3 text-[12px] text-muted">
                          Last sign in {user.lastLoginAt ? fromNow(user.lastLoginAt) : 'never'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2.5">
                      <button type="button" className="btn btn-secondary btn-sm flex-1" onClick={() => openEdit(user)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm flex-1" onClick={() => openReset(user)}>
                        <KeyRound className="h-4 w-4" />
                        Reset password
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : null}
      </Section>

      <p className="mt-12 max-w-2xl border-t border-rule pt-6 text-[13px] leading-6 text-muted">
        Anyone with an email address can be added, including Gmail and other personal domains. Accounts
        are private to the association and never self-register.
      </p>

      <Modal
        open={dialog?.type === 'add'}
        onClose={close}
        title="Add a team member"
        description="They sign in with this email and temporary password."
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submitAdd} disabled={create.isPending}>
              {create.isPending ? <Spinner className="h-4 w-4" /> : <MailPlus className="h-4 w-4" />}
              {create.isPending ? 'Creating…' : 'Create account'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="new-name">
              Full name
            </label>
            <input
              id="new-name"
              className="input"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="e.g. Ananya Rao"
            />
          </div>
          <div>
            <label className="label" htmlFor="new-email">
              Email address
            </label>
            <input
              id="new-email"
              type="email"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@gmail.com"
            />
            <p className="hint">Any domain is fine — this is where the review email will be sent from.</p>
          </div>
          <div>
            <label className="label" htmlFor="new-password">
              Temporary password
            </label>
            <input
              id="new-password"
              type="text"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <p className="hint">Share this privately. They will be prompted to change it after signing in.</p>
          </div>
          <div>
            <label className="label" htmlFor="new-role">
              Role
            </label>
            <select
              id="new-role"
              className="input"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              <option value="MEMBER">Member — create and prepare content</option>
              <option value="SUPER_ADMIN">Super Admin — approve and administer</option>
            </select>
          </div>
          {error ? <p className="field-error">{error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={dialog?.type === 'edit'}
        onClose={close}
        title="Edit account"
        description={dialog?.type === 'edit' ? dialog.user.email : undefined}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submitEdit} disabled={update.isPending}>
              {update.isPending ? <Spinner className="h-4 w-4" /> : null}
              {update.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="edit-name">
              Full name
            </label>
            <input
              id="edit-name"
              className="input"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="edit-role">
              Role
            </label>
            <select
              id="edit-role"
              className="input"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              disabled={dialog?.type === 'edit' && dialog.user.id === currentUser?.id}
            >
              <option value="MEMBER">Member</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            {dialog?.type === 'edit' && dialog.user.id === currentUser?.id ? (
              <p className="hint">You cannot change your own role.</p>
            ) : null}
          </div>
          <label className="flex cursor-pointer items-start gap-3.5 border border-rule-strong px-5 py-4 transition-colors hover:border-paper">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded-none border-rule-strong accent-paper"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              disabled={dialog?.type === 'edit' && dialog.user.id === currentUser?.id}
            />
            <span>
              <span className="block text-[14px] font-medium text-paper">Account is active</span>
              <span className="mt-1 block text-[13px] leading-6 text-muted">
                Inactive members cannot sign in. At least one active Super Admin must remain.
              </span>
            </span>
          </label>
          {error ? <p className="field-error">{error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={dialog?.type === 'reset'}
        onClose={close}
        title="Reset password"
        description={dialog?.type === 'reset' ? `Set a temporary password for ${dialog.user.fullName}.` : undefined}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submitReset} disabled={reset.isPending}>
              {reset.isPending ? <Spinner className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
              {reset.isPending ? 'Resetting…' : 'Reset password'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="reset-password">
              New temporary password
            </label>
            <input
              id="reset-password"
              type="text"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="reset-confirm">
              Confirm password
            </label>
            <input
              id="reset-confirm"
              type="text"
              className="input"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
          <p className="text-[13px] leading-6 text-muted">
            The member will be required to choose a new password after signing in.
          </p>
          {error ? <p className="field-error">{error}</p> : null}
        </div>
      </Modal>
    </div>
  )
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'That change could not be saved. Please try again.'
}
