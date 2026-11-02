# Agent Workflow — End-to-End Application Development

> Step-by-step process the agent follows to build software from idea to deployment.

## Overview

**Name:** End-to-End App Development  
**Trigger:** A product idea, feature request, or issue description from the user  
**Inputs:** Idea/spec, preferred tech stack (optional), target platform (web/mobile/CLI)  
**Outputs:** Source code repository, passing tests, README, deployment URL (optional)

## Workflow Steps

### Step 1 — Requirements & Spec
**Goal:** Clarify what to build and how success is measured.

**Actions:**
- Interview the user (ask clarifying questions) if the idea is vague
- Define user stories and acceptance criteria
- Choose target platform (web app, mobile app, CLI tool, API, etc.)
- Note any constraints (budget, timeline, compliance, legacy integration)

**Success:** A written spec exists with user stories and acceptance criteria.

**Deliverable:** `SPEC.md` in the project root.

---

### Step 2 — Architecture & Stack Selection
**Goal:** Design the system and choose technologies.

**Actions:**
- Select language/framework (e.g., Next.js + PostgreSQL, React + FastAPI, Flutter + Supabase)
- Design data model / database schema
- Design API routes or internal module boundaries
- Plan folder structure
- Identify third-party services needed (auth, payments, hosting)

**Success:** Architecture document reviewed and approved by user.

**Deliverable:** `ARCHITECTURE.md`, `DATABASE.md` (if applicable), folder structure sketch.

---

### Step 3 — Project Setup
**Goal:** Initialize a working, version-controlled project.

**Actions:**
- Initialize Git repository
- Scaffold project with chosen framework
- Install core dependencies
- Configure linting, type-checking, formatter (ESLint, Prettier, Ruff, etc.)
- Set up environment variable template (`.env.example`)
- Configure CI workflow (GitHub Actions, GitLab CI, etc.)
- Make first commit

**Success:** `npm install` (or equivalent) succeeds, lint passes on empty scaffold, `git status` is clean.

---

### Step 4 — Implement Features (Iterative)
**Goal:** Build the application feature by feature.

**For each feature:**
1. Write a failing test (TDD) or define expected behavior
2. Implement backend logic (API, database, business rules)
3. Implement frontend UI (if applicable)
4. Connect frontend to backend
5. Run tests and type checks
6. Fix failures
7. Commit

**Features to implement (example for a full-stack app):**
- [ ] Project foundation (routing, state management, database connection)
- [ ] User authentication (signup, login, logout, session)
- [ ] Core domain feature #1
- [ ] Core domain feature #2
- [ ] Core domain feature #3
- [ ] Settings / profile
- [ ] Error handling and loading states
- [ ] Responsive design

**Success:** All features implemented, tests pass, app runs locally.

---

### Step 5 — Testing & Quality Assurance
**Goal:** Verify correctness and stability.

**Actions:**
- Write unit tests for business logic and utilities
- Write integration tests for API routes and database interactions
- Write end-to-end tests for critical user flows (if web app)
- Run full test suite
- Run linting and type-checking
- Fix all failures
- Manual smoke test of critical flows

**Success:** Test suite green, lint clean, no type errors, smoke test passes.

---

### Step 6 — Code Review & Refinement
**Goal:** Ensure code quality and maintainability.

**Actions:**
- Self-review diff for clarity, naming, and consistency
- Remove dead code and console.log statements
- Add comments for complex logic
- Ensure error handling is consistent
- Optimize obvious performance bottlenecks
- Update documentation in code

**Success:** Code passes internal review bar; user signs off if they requested review.

---

### Step 7 — Deployment
**Goal:** Ship the application to a live environment.

**Actions:**
- Choose deployment target (Vercel, Netlify, Railway, Fly.io, AWS, etc.)
- Configure build settings and environment variables
- Deploy to staging first
- Run post-deploy smoke tests
- **Request user approval before deploying to production**
- Deploy to production (only with approval)
- Verify live deployment

**Success:** Application is live and accessible; post-deploy checks pass.

**Note:** Staging deployment can proceed without approval. Production deployment requires explicit user consent.

---

### Step 8 — Documentation & Handoff
**Goal:** Make the app maintainable.

**Actions:**
- Write `README.md` with setup, run, and deploy instructions
- Document environment variables required
- Document API endpoints (if applicable)
- Document architecture decisions
- Create `DEPLOYMENT.md` if deployment is non-trivial
- Hand off repository URL and live URL to user

**Success:** A new developer could clone the repo and run the app using only the README.

---

## State File

The agent maintains `AGENT_STATE.md` tracking:

```markdown
# Agent State
- Run ID:
- App name:
- Tech stack:
- Current phase: (Requirements / Architecture / Setup / Implement / Test / Review / Deploy / Document)
- Completed features:
- In-progress feature:
- Blocked features:
- Next action:
- Repo URL:
- Deploy URL:
```

---

*Customize the feature list in Step 4 to match your specific app. The workflow is iterative — loop back to Step 4 for additional features or to Step 5 if tests fail.*