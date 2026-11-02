# SPECANCIENS Social Desk — Architecture

## 1. Shape of the system

A modular monolith deployed as one application plus PostgreSQL, behind Caddy.

```text
Browser
  │ HTTPS
  ▼
Caddy (TLS termination, reverse proxy)
  │
  ▼
Spring Boot application
  ├── REST API (/api/**)
  ├── React static build (served from classpath)
  ├── Session authentication
  ├── Review workflow
  ├── Excel generation (Apache POI)
  └── Scheduled Excel snapshots
        │
        ▼
PostgreSQL (private Docker network)
        │
        ▼
Backups volume (Excel snapshots + pg_dump)
```

The React build is copied into `backend/src/main/resources/static` for production. Both the SPA and API are served from the same origin, avoiding CORS and third-party cookie problems.

## 2. Stack

### Backend

- Java 21
- Spring Boot 4.x
- Spring Web MVC
- Spring Data JPA
- Spring Security (session-based authentication)
- Bean Validation
- PostgreSQL 17 (production), H2 in PostgreSQL mode (local development)
- Flyway database migrations
- Apache POI for Excel
- Spring Actuator health endpoint
- Maven wrapper

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form + Zod
- Tailwind CSS
- date-fns
- lucide-react icons

### Infrastructure

- Docker Compose: `caddy`, `app`, `db`
- Caddy automatic HTTPS via Let's Encrypt
- Ubuntu 24.04 LTS
- No external managed database, email, or storage services
- GitHub repository and optional GitHub Actions deployment

## 3. Authentication and authorization

- Local email/password accounts. No public registration.
- Passwords hashed with BCrypt.
- Session cookie, `HttpOnly`, `SameSite=Lax`; `Secure` in production.
- Login endpoint authenticates and persists a server-side session.
- The Super Admin is bootstrapped from environment variables on first startup.
- Roles: `SUPER_ADMIN`, `MEMBER`.
- Super Admin endpoints use method/URL authorization.
- Review links are normal app URLs. The user must be signed in. The link itself does not grant approval rights.
- This prevents a member from copying the review URL from their own Gmail draft and approving their own post.
- Session lifetime is configurable; the default is 30 days for convenience.

## 4. Data model

### `app_users`

- `id` UUID
- `email` unique
- `full_name`
- `password_hash`
- `role`
- `active`
- `must_change_password`
- `created_at`, `updated_at`, `last_login_at`

### `posts`

- `id` UUID
- `title`
- `post_type` (`POST`, `REEL`, `STORY`, `OTHER`)
- `publish_date`
- `status` (`DRAFT`, `IN_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `POSTED`, `CANCELLED`)
- `assignee_id`
- `drive_url`
- `caption`
- `notes`
- `posted_url`
- `posted_at`
- `created_by`
- `review_round`
- `version` for optimistic locking
- `created_at`, `updated_at`

### `post_platforms`

- `post_id`
- `platform` (`INSTAGRAM`, `FACEBOOK`, `LINKEDIN`)
- Composite primary key

### `review_requests`

- `id` UUID
- `post_id`
- `round`
- `status` (`PREPARED`, `SENT`, `APPROVED`, `CHANGES_REQUESTED`, `SUPERSEDED`)
- `requested_by`
- `recipient_email`
- `email_subject`
- `email_body`
- `prepared_at`, `sent_at`, `decided_at`
- `decided_by`
- `feedback`

### `audit_events`

- `id` UUID
- `post_id` nullable
- `actor_id`
- `action`
- `details`
- `created_at`

### `post_comments` (deferred)

General post comments are not required for the first vertical slice. Review feedback is stored on the review request. The schema can add comments later without changing existing tables.

## 5. API outline

### Auth

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Sign in |
| POST | `/api/auth/logout` | Authenticated | Sign out |
| GET | `/api/auth/me` | Authenticated | Current user |
| POST | `/api/auth/change-password` | Authenticated | Change password |

### Posts

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/posts` | Authenticated | List/filter posts |
| POST | `/api/posts` | Authenticated | Create draft |
| GET | `/api/posts/{id}` | Authenticated | Detail, review history, audit |
| PUT | `/api/posts/{id}` | Creator/assignee/Super Admin | Edit draft or changes-requested post |
| POST | `/api/posts/{id}/review-requests` | Creator/assignee | Prepare Gmail review request |
| POST | `/api/posts/{id}/mark-posted` | Assignee/Super Admin | Confirm posting |
| POST | `/api/posts/{id}/reopen` | Super Admin | Reopen approved post |
| POST | `/api/posts/{id}/cancel` | Creator/assignee/Super Admin | Cancel post |

### Reviews

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/review-requests/{id}/mark-sent` | Requester/Super Admin | Confirm Gmail was sent |
| GET | `/api/review-requests/{id}` | Super Admin | Review page data |
| POST | `/api/review-requests/{id}/approve` | Super Admin | Approve |
| POST | `/api/review-requests/{id}/request-changes` | Super Admin | Request changes |

### Users and admin

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/users` | Super Admin | List users |
| POST | `/api/users` | Super Admin | Create user |
| PATCH | `/api/users/{id}` | Super Admin | Update name/role/active |
| POST | `/api/users/{id}/reset-password` | Super Admin | Reset password |
| GET | `/api/dashboard` | Authenticated | Counts and upcoming posts |
| GET | `/api/admin/exports/excel` | Super Admin | Download current workbook |
| GET | `/api/admin/backups` | Super Admin | List snapshots |
| GET | `/api/admin/backups/{filename}` | Super Admin | Download snapshot |

## 6. Gmail compose integration

The backend builds an encoded Gmail compose URL:

```text
https://mail.google.com/mail/?view=cm&fs=1&to=...&su=...&body=...
```

The email body contains a short summary and the app review URL. It does not contain the full caption to keep the URL reasonably sized. The email body and subject are stored on the review request for audit.

No Gmail API, SMTP server, or OAuth scopes are required.

The sender must explicitly mark the request as sent. The UI shows a “prepared” badge until that happens, and the review request remains editable in the app only through a new preparation.

## 7. Excel generation

`ExcelExportService` reads all posts and review requests, builds an `XSSFWorkbook` from a template style, and streams it to the caller.

- `Tracker` sheet: post-level data, hyperlinks, status colours, frozen header, auto-filter.
- `Review History` sheet: one row per review round.
- Date format: `dd MMM yyyy`.
- Snapshot filename: `SPECANCIENS_Content_Tracker_yyyy-MM-dd.xlsx`.
- Snapshot directory configured via `APP_BACKUP_DIR`.
- Scheduled job runs nightly at 02:00 in the configured timezone.
- Retention: 30 daily snapshots.
- Downloads are restricted to the Super Admin.

Database backups are handled by a deployment cron job using `pg_dump`; the application does not shell out to `pg_dump`.

## 8. Security notes

- No public signup.
- All admin endpoints require `SUPER_ADMIN`.
- Review decisions require a signed-in Super Admin.
- File downloads check that the requested filename is a simple file inside the backup directory (no path traversal).
- Login rate limiting is a follow-up hardening item.
- CSRF protection is deferred for the MVP because the API is same-origin JSON-only and session cookies use `SameSite=Lax`. This is documented as a hardening item before broad exposure.
- The VPS should use SSH keys, UFW (22/80/443 only), fail2ban, and automatic security updates.
- PostgreSQL must not be exposed publicly.
- Secrets live in `.env`, never in Git.

## 9. Testing strategy

- Unit tests for status transitions, Gmail URL construction, and Excel generation.
- Integration tests with Spring Boot, MockMvc, and H2 for:
  - login and session
  - member cannot approve
  - prepare review → mark sent → approve
  - request changes → edit → resubmit
  - post/reel posted URL required; story not required
  - admin user management
  - Excel download access control
- Frontend: TypeScript build and lint. Browser smoke test of login, tracker, review flow once the UI is running.

## 10. Deployment topology

```text
/opt/socialdesk/
├── docker-compose.yml
├── Caddyfile
├── Dockerfile
├── .env
├── deploy/
│   └── backup-db.sh
├── backups/
│   └── db/
└── (source tree)
```

The Dockerfile builds the React bundle, embeds it in the Spring Boot jar, and runs the jar as a non-root user. Caddy listens on 80/443 and proxies to the app container on port 8080. PostgreSQL is on an internal Docker network only.

Named volumes:

- `postgres-data` — database files
- `excel-backups` — nightly Excel snapshots (mounted at `/app/backups`)
- `caddy-data` / `caddy-config` — TLS certificates and Caddy state

Nightly host cron:

```text
15 2 * * *  cd /opt/socialdesk && ./deploy/backup-db.sh
```

The app's own scheduler writes Excel snapshots at 02:00 IST. Both retention policies keep 30 days.

## 11. Open items

- Confirm real Super Admin email and bootstrap password before production.
- Confirm DNS access for `social.stpetershyd.com`.
- Confirm whether the VPS has a clean Ubuntu installation or a control panel.
- Add login rate limiting and CSRF hardening before exposing the app outside the association.
- Add optional Google Workspace sign-in later if college IT provides an OAuth client.
