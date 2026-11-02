import type {
  BackupPage,
  CreateUserInput,
  Dashboard,
  PostDetail,
  PostInput,
  PostSummary,
  PrepareReviewResponse,
  ReviewPageResponse,
  UpdateUserInput,
  User,
  UserOption,
} from './types'

export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const error = payload as { message?: string; fieldErrors?: Record<string, string> } | null
    throw new ApiError(
      error?.message ?? `Request failed with status ${response.status}.`,
      response.status,
      error?.fieldErrors,
    )
  }

  return payload as T
}

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const value = search.toString()
  return value ? `?${value}` : ''
}

export const api = {
  async me(): Promise<User | null> {
    try {
      return await request<User>('/api/auth/me')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },

  login(email: string, password: string): Promise<User> {
    return request<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  logout(): Promise<void> {
    return request<void>('/api/auth/logout', { method: 'POST' })
  },

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return request<void>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },

  dashboard(): Promise<Dashboard> {
    return request<Dashboard>('/api/dashboard')
  },

  posts(filters: {
    status?: string
    postType?: string
    assigneeId?: string
    fromDate?: string
    toDate?: string
    search?: string
  } = {}): Promise<PostSummary[]> {
    return request<PostSummary[]>(`/api/posts${query(filters)}`)
  },

  post(id: string): Promise<PostDetail> {
    return request<PostDetail>(`/api/posts/${id}`)
  },

  createPost(input: PostInput): Promise<PostDetail> {
    return request<PostDetail>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  updatePost(id: string, input: PostInput): Promise<PostDetail> {
    return request<PostDetail>(`/api/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },

  prepareReview(postId: string): Promise<PrepareReviewResponse> {
    return request<PrepareReviewResponse>(`/api/posts/${postId}/review-requests`, {
      method: 'POST',
    })
  },

  markReviewSent(reviewId: string): Promise<void> {
    return request<void>(`/api/review-requests/${reviewId}/mark-sent`, { method: 'POST' })
  },

  review(reviewId: string): Promise<ReviewPageResponse> {
    return request<ReviewPageResponse>(`/api/review-requests/${reviewId}`)
  },

  approveReview(reviewId: string, feedback: string): Promise<PostDetail> {
    return request<PostDetail>(`/api/review-requests/${reviewId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ feedback: feedback.trim() || null }),
    })
  },

  requestChanges(reviewId: string, feedback: string): Promise<PostDetail> {
    return request<PostDetail>(`/api/review-requests/${reviewId}/request-changes`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    })
  },

  markPosted(postId: string, postedUrl: string): Promise<PostDetail> {
    return request<PostDetail>(`/api/posts/${postId}/mark-posted`, {
      method: 'POST',
      body: JSON.stringify({ postedUrl: postedUrl.trim() || null }),
    })
  },

  reopenPost(postId: string, reason: string): Promise<PostDetail> {
    return request<PostDetail>(`/api/posts/${postId}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },

  cancelPost(postId: string, reason: string): Promise<PostDetail> {
    return request<PostDetail>(`/api/posts/${postId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason.trim() || null }),
    })
  },

  users(): Promise<User[]> {
    return request<User[]>('/api/users')
  },

  userOptions(): Promise<UserOption[]> {
    return request<UserOption[]>('/api/users/options')
  },

  createUser(input: CreateUserInput): Promise<User> {
    return request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  updateUser(id: string, input: UpdateUserInput): Promise<User> {
    return request<User>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  resetPassword(id: string, password: string): Promise<void> {
    return request<void>(`/api/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  },

  backups(): Promise<BackupPage> {
    return request<BackupPage>('/api/admin/backups')
  },

  runBackup(): Promise<{ filename: string }> {
    return request<{ filename: string }>('/api/admin/backups/run', { method: 'POST' })
  },

  async downloadCurrentExcel(): Promise<void> {
    await downloadFile('/api/admin/exports/excel', fallbackFilename())
  },

  async downloadBackup(filename: string): Promise<void> {
    await downloadFile(`/api/admin/backups/${encodeURIComponent(filename)}`, filename)
  },
}

function fallbackFilename(): string {
  const date = new Date().toISOString().slice(0, 10)
  return `SPECANCIENS_Content_Tracker_${date}.xlsx`
}

async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const response = await fetch(path, { credentials: 'same-origin' })
  if (!response.ok) {
    throw new ApiError('The download could not be prepared.', response.status)
  }
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  const filename = match?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
