# SPECANCIENS Social Desk

A private content tracker and review workflow for the SPECANCIENS social media team.

- Plan Instagram, Facebook and LinkedIn posts in one shared tracker.
- Keep assets in Google Drive — the app never stores uploads.
- Prepare a review email in Gmail with one click; no Gmail API or SMTP server is used.
- The President (Super Admin) signs in and approves or requests changes.
- Mark posts as posted with a live URL, and keep an audit trail of every review round.
- Download a formatted Excel workbook on demand, with a nightly snapshot.

The app is a single Spring Boot service that also serves the React build, backed by PostgreSQL. Caddy provides automatic HTTPS.

---

## Local development

### Prerequisites

- Java 21
- Node.js 20.19+ or 22.12+
- npm

Docker is **not** required for local development. The `dev` profile uses a file-based H2 database.

### 1. Backend

```bash
cd backend
./mvnw spring-boot:run
```

The API starts on <http://localhost:8080>. On first start it creates:

- Database: `backend/data/socialdesk`
- Super Admin: `admin@specanciens.local` / `ChangeMe123!`

Change this password from **Profile** before sharing the app.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` and `/actuator` to port 8080.

### 3. Tests and production build

```bash
cd backend
./mvnw test

cd ../frontend
npm run build
```

`npm run build` writes the production bundle to `backend/src/main/resources/static`. Building the backend jar after that produces a single deployable artifact at `backend/target/socialdesk-0.0.1-SNAPSHOT.jar`.

Use `clean` here so hashed asset files from earlier builds do not linger in the jar:

```bash
cd backend
./mvnw clean package -DskipTests
java -jar target/socialdesk-0.0.1-SNAPSHOT.jar
```

Then open <http://localhost:8080>. Avoid running this while the dev backend is using the same H2 file.

### Configuration

Local defaults live in `backend/src/main/resources/application-dev.yml`. Override them with environment variables when needed:

| Variable | Default (dev) | Purpose |
|---|---|---|
| `APP_BASE_URL` | `http://localhost:5173` | Base URL used in review links and Gmail drafts |
| `APP_REVIEWER_EMAIL` | `president@stpetershyd.com` | Recipient pre-filled in the Gmail compose window |
| `APP_BACKUP_DIR` | `./backups` | Directory for nightly Excel snapshots |
| `APP_TIMEZONE` | `Asia/Kolkata` | Timezone for dates and the nightly snapshot |
| `APP_BACKUP_RETENTION_DAYS` | `30` | Excel snapshot retention |
| `APP_BOOTSTRAP_ADMIN_EMAIL` | `admin@specanciens.local` | First Super Admin (only when the DB has no users) |
| `APP_BOOTSTRAP_ADMIN_PASSWORD` | `ChangeMe123!` | First Super Admin password |
| `APP_BOOTSTRAP_ADMIN_NAME` | `SPECANCIENS Super Admin` | First Super Admin display name |

---

## Production deployment (Hostinger KVM 4, Ubuntu 24.04)

### 1. DNS

Point an `A` record for `social.stpetershyd.com` to the VPS IPv4 address. If the VPS has IPv6, add an `AAAA` record as well; otherwise remove any stale `AAAA` record so Caddy can validate the domain.

Wait for DNS to resolve before starting Caddy:

```bash
dig +short social.stpetershyd.com
```

### 2. Server packages and firewall

Install Docker Engine and the Compose plugin using Docker's official Ubuntu instructions, then:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

Port 8080 and PostgreSQL stay private inside the Compose network.

### 3. Deploy

```bash
sudo mkdir -p /opt/socialdesk
sudo chown "$USER":"$USER" /opt/socialdesk
# Copy the project files into /opt/socialdesk, then:
cd /opt/socialdesk

cp .env.example .env
nano .env
```

Set at least:

- `DB_PASSWORD` — a long random value (`openssl rand -base64 32`)
- `APP_BOOTSTRAP_ADMIN_EMAIL` — the President's real email
- `APP_BOOTSTRAP_ADMIN_NAME`
- `APP_BOOTSTRAP_ADMIN_PASSWORD` — a strong temporary password
- `APP_REVIEWER_EMAIL` — where review requests should go

Then start the stack:

```bash
docker compose up -d --build
docker compose ps
```

Caddy obtains the HTTPS certificate automatically. Check:

```bash
curl -fsS https://social.stpetershyd.com/actuator/health
```

Expected: `{"status":"UP"}`.

### 4. First sign-in

1. Sign in with the bootstrap President account.
2. Change the password from **Profile**.
3. Open **Team** and create accounts for the social media team.
4. Share temporary passwords privately. Members are prompted to change them after their first sign-in.

There is no public registration and no password-reset email. The Super Admin resets passwords from **Team → Reset**.

---

## Operations

### Logs and status

```bash
cd /opt/socialdesk
docker compose ps
docker compose logs -f app
docker compose logs -f caddy
```

### Restart / update

```bash
docker compose up -d --build
```

The PostgreSQL and Excel volumes survive rebuilds. To update code, replace the project files and rerun the command above.

### Excel snapshots

The app writes `SPECANCIENS_Content_Tracker_YYYY-MM-DD.xlsx` every night at 02:00 IST into the `excel-backups` Docker volume. The last 30 files are kept. Download them from **Administration → Excel backups**.

The Excel export is one-way. Editing a downloaded workbook never changes the live database.

### PostgreSQL backups

Create `backups/db` on the host and run a nightly dump. Example `deploy/backup-db.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups/db
stamp="$(date +%F)"
docker compose exec -T db pg_dump -U socialdesk -d socialdesk --clean --if-exists \
  | gzip > "backups/db/socialdesk-${stamp}.sql.gz"

find backups/db -name 'socialdesk-*.sql.gz' -mtime +30 -delete
```

Install it as a cron job (02:15 IST):

```cron
15 2 * * * cd /opt/socialdesk && ./deploy/backup-db.sh >> backups/db/backup.log 2>&1
```

Restore a dump into an empty database:

```bash
gunzip -c backups/db/socialdesk-2026-11-01.sql.gz \
  | docker compose exec -T db psql -U socialdesk -d socialdesk
```

Test a restore occasionally, and keep an off-server copy using the Hostinger VPS backup facility.

### Certificate renewal

Caddy renews certificates automatically. If DNS or ports were wrong, fix them and run:

```bash
docker compose restart caddy
docker compose logs -f caddy
```

---

## How the review workflow behaves

1. A member creates a draft and clicks **Request review**.
2. The app prepares a Gmail compose link containing the review URL. **No email is sent by the app.**
3. The member sends the email from their own Gmail, then confirms **I have sent it**.
4. The President opens the link, signs in, and approves or requests changes.
5. Approval locks the post. The assignee marks it posted and records the live URL (required for posts and reels, optional for stories).
6. Every action is recorded in the post activity and in the Excel `Review History` sheet.

Review links require a signed-in Super Admin. A member cannot copy a link from their own draft and approve their own content.

---

## Security checklist

- [ ] `.env` is present only on the server and is never committed.
- [ ] The bootstrap password was changed after the first sign-in.
- [ ] UFW allows only 22, 80, 443.
- [ ] PostgreSQL is not published to the host.
- [ ] SSH keys are used and password login is disabled.
- [ ] Unattended security upgrades are enabled.
- [ ] Database dumps are copied off the VPS.
- [ ] The President's account uses a unique password.

Login rate limiting and CSRF tokens are documented follow-ups; the API is same-origin JSON with `SameSite=Lax` session cookies. Do not expose the app under a different origin without revisiting that.

---

## Project layout

```text
backend/    Spring Boot API, workflow, Excel export, tests
frontend/   React + TypeScript + Vite UI
Dockerfile  Multi-stage build (frontend → backend → runtime)
docker-compose.yml
Caddyfile
.env.example
SPEC.md
ARCHITECTURE.md
```
# SM_Project
