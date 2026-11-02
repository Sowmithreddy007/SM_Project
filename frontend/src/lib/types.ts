export type Role = 'SUPER_ADMIN' | 'MEMBER'
export type PostStatus = 'DRAFT' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'POSTED' | 'CANCELLED'
export type PostType = 'POST' | 'REEL' | 'STORY' | 'OTHER'
export type Platform = 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN'
export type ReviewStatus = 'PREPARED' | 'SENT' | 'APPROVED' | 'CHANGES_REQUESTED' | 'SUPERSEDED'

export interface User {
  id: string
  email: string
  fullName: string
  role: Role
  active: boolean
  mustChangePassword: boolean
  createdAt: string
  lastLoginAt?: string | null
}

export interface UserOption {
  id: string
  fullName: string
  email: string
  role: Role
}

export interface Review {
  id: string
  roundNumber: number
  status: ReviewStatus
  requestedByName?: string | null
  recipientEmail: string
  preparedAt: string
  sentAt?: string | null
  decidedAt?: string | null
  decidedByName?: string | null
  feedback?: string | null
}

export interface AuditEvent {
  id: string
  postId?: string | null
  actorId?: string | null
  actionType: string
  details?: string | null
  createdAt: string
}

export interface PostSummary {
  id: string
  title: string
  postType: PostType
  platforms: Platform[]
  publishDate: string
  status: PostStatus
  assignee: UserOption
  driveUrl: string
  captionPreview: string
  postedUrl?: string | null
  reviewRound: number
  updatedAt: string
}

export interface PostDetail {
  id: string
  title: string
  postType: PostType
  platforms: Platform[]
  publishDate: string
  status: PostStatus
  assignee: UserOption
  createdBy: UserOption
  driveUrl: string
  caption: string
  notes?: string | null
  postedUrl?: string | null
  postedAt?: string | null
  reviewRound: number
  createdAt: string
  updatedAt: string
  reviews: Review[]
  audit: AuditEvent[]
}

export interface PostInput {
  title: string
  postType: PostType
  platforms: Platform[]
  publishDate: string
  assigneeId: string
  driveUrl: string
  caption: string
  notes?: string
}

export interface PrepareReviewResponse {
  reviewRequestId: string
  recipientEmail: string
  subject: string
  body: string
  reviewUrl: string
  gmailComposeUrl: string
  preparedAt: string
}

export interface ReviewPageResponse {
  post: PostDetail
  review: Review
}

export interface Dashboard {
  totalPosts: number
  drafts: number
  inReview: number
  changesRequested: number
  approved: number
  posted: number
  cancelled: number
  today: string
  reviewQueue: PostSummary[]
  upcomingApproved: PostSummary[]
  overdue: PostSummary[]
}

export interface BackupInfo {
  filename: string
  sizeBytes: number
  modifiedAt: string
}

export interface BackupPage {
  snapshots: BackupInfo[]
  retentionDays: number
}

export interface CreateUserInput {
  email: string
  fullName: string
  password: string
  role: Role
}

export interface UpdateUserInput {
  fullName: string
  role: Role
  active: boolean
}
