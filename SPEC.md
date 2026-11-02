# SPECANCIENS Social Desk — Product Specification

## 1. Overview

A private web application for the SPECANCIENS social media team that replaces the shared Excel content tracker while keeping the review conversation in Gmail.

The application is the source of truth for content status, assignments, review decisions, and posting confirmation. A generated Excel workbook is maintained as a human-readable backup and snapshot. Gmail remains the channel for review requests and replies.

## 2. Goals

- Replace the manually maintained Excel tracker.
- Give the team one place to see every post, its owner, planned date, status, and review history.
- Preserve email as the review communication channel, including business-writing practice for team members.
- Let the Super Admin (President / SM mentor) approve or request changes from a link in the review email.
- Produce an up-to-date Excel export on demand, plus nightly snapshots.
- Keep hosting self-contained on the association's Hostinger KVM 4 VPS using free/open-source software only.
- Support 10–12 users and up to 20 posts per month.

## 3. Non-goals (v1)

- Uploading images or video. Assets remain Google Drive links.
- Sending email from the application. Gmail compose links are used instead.
- Reading Gmail replies or detecting that an email was sent through Gmail APIs.
- Automatically publishing or scheduling content to Instagram, Facebook, or LinkedIn.
- Public signup or access outside the association.
- Two-way Excel synchronisation.
- Mobile apps.

## 4. Users and roles

### Super Admin

- One business role, held by the President / SM mentor.
- Approves or requests changes on posts.
- Can view and edit all posts.
- Can manage users and reset passwords.
- Can download Excel exports and snapshots.
- Must sign in before approving. A review-email link opens the review page, but approval authorisation comes from the signed-in Super Admin account.

### Member

- Social media team member.
- Can view all posts.
- Can create posts and edit posts they created or are assigned to.
- Can prepare a Gmail review request and mark it as sent.
- Can mark an approved post as posted.
- Cannot approve posts or manage users.

## 5. Content workflow

```text
DRAFT
  │ prepare review email
  ▼
(review email prepared) ── mark as sent ──> IN_REVIEW
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     │                                                     │
             Request changes                                          Approve
                     │                                                     │
                     ▼                                                     ▼
             CHANGES_REQUESTED                                         APPROVED
                     │                                                     │
             edit + prepare new review                              mark as posted
                     │                                                     │
                     └──────────────> IN_REVIEW                            ▼
                                                                        POSTED
```

### Status rules

- A post starts as `DRAFT`.
- Preparing the Gmail review request creates a `ReviewRequest` with status `PREPARED`; the post remains `DRAFT`.
- The sender must explicitly click **Mark as sent for review** after sending the Gmail message.
- Marking sent changes the post to `IN_REVIEW`.
- Only the Super Admin can approve or request changes.
- Requesting changes requires written feedback.
- Approval locks the post. It cannot be edited in `APPROVED` or `POSTED` state.
- After changes are requested, the post can be edited and a new review round prepared.
- Marking posted is allowed only from `APPROVED`.
- For `POST` and `REEL`, a live URL is required when marking posted.
- For `STORY`, a live URL is optional because stories expire. A Drive proof/screenshot link may be recorded in the posted URL field.
- A Super Admin may reopen an approved post with a reason, returning it to `CHANGES_REQUESTED`.
- Posts are cancelled, not deleted. Soft-cancel status is `CANCELLED`.

## 6. Content fields

| Field | Required | Notes |
|---|---|---|
| Title / post name | Yes | Max 180 characters |
| Post type | Yes | `POST`, `REEL`, `STORY`, `OTHER` |
| Platforms | Yes | `INSTAGRAM`, `FACEBOOK`, `LINKEDIN`; at least one |
| Planned publish date | Yes | Date only |
| Assignee | Yes | Active user |
| Google Drive link | Yes | HTTPS URL; no file upload |
| Caption | Yes | Long text; copy button in UI |
| Notes | No | Internal production notes |
| Posted URL | Conditional | Required for posts/reels; optional for stories |
| Status | System | Workflow-controlled |
| Review round | System | Increments when a new review request is prepared after changes |

## 7. Email review flow

1. A Member opens an editable post and clicks **Request review**.
2. The backend creates a review request and returns a pre-filled Gmail compose URL.
3. The frontend opens Gmail in a new tab/window. The Member can edit the email before sending.
4. The email contains a link to the review page.
5. The Member returns to the app and clicks **Mark as sent for review**.
6. The Super Admin opens the link, signs in if needed, and reviews the post.
7. The Super Admin chooses **Approve** or **Request changes** and adds feedback if required.
8. The app records the decision, reviewer, timestamp, and feedback.
9. If approved, the assignee marks the post as posted with a live URL/proof when required.

The application does not detect Gmail delivery or replies. The manual confirmation is intentional and is the only reliable option without Gmail API integration.

## 8. Excel backup

- `Download Excel` generates the workbook on demand from the current database state.
- A scheduled job writes a nightly snapshot to persistent storage.
- Keep 30 daily Excel snapshots.
- Workbook contains:
  - `Tracker` sheet with current post data.
  - `Review History` sheet with each review round.
- Excel export is one-way: app → Excel.
- The database remains the source of truth.
- The deployment also runs nightly PostgreSQL `pg_dump` backups.
- Snapshots are stored on the VPS; Hostinger VPS snapshot/backup facilities should be used for off-server safety when available.

## 9. Screens

- Login
- Dashboard
- Content tracker table with filters and search
- Calendar month view
- Create/edit post
- Post detail with status timeline and review history
- Review page for the Super Admin
- Gmail review-request dialog
- Excel backups page (Super Admin)
- User management (Super Admin)
- Profile / change password

## 10. Hosting and technology

- Hostinger KVM 4 VPS, clean Ubuntu 24.04 LTS
- Docker Compose
- Caddy for HTTPS / Let's Encrypt
- Spring Boot (Java 21) + PostgreSQL
- React + TypeScript + Vite, compiled and served by Spring Boot
- Apache POI for `.xlsx` generation
- Local email/password authentication
- App URL: `https://social.stpetershyd.com`

## 11. Acceptance criteria

- A member can log in, create a post, open a pre-filled Gmail review email, and mark it sent.
- A Super Admin can open the review link, sign in, approve or request changes, and the status updates.
- Changes-requested posts can be edited and resubmitted as a new review round.
- Approved posts can be marked posted, with URL validation for posts/reels.
- A Super Admin can add and deactivate users with any email domain.
- Downloading Excel produces a valid `.xlsx` with current posts and review history.
- A nightly Excel snapshot is created and visible on the backups page.
- Non-authenticated users cannot call protected APIs.
- Members cannot approve posts or access admin pages.
- The application runs as a single Docker Compose stack on the VPS.
- The core flow is covered by automated backend tests and at least one frontend build check.
