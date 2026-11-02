# Agent Workflow Kit — End-to-End Software Development

This folder contains markdown templates for building an AI agent that builds apps end to end: from idea, through architecture and code, to testing, deployment, and documentation.

## Files

| File | Purpose |
|------|---------|
| `AGENT_SYSTEM_PROMPT.md` | Core identity, behavior, and operating instructions for the dev agent |
| `AGENT_WORKFLOW.md` | 8-phase SDLC: Requirements → Architecture → Setup → Implement → Test → Review → Deploy → Document |
| `AGENT_TOOLS.md` | Tool definitions: read/write files, terminal, git, packages, tests, web search |
| `AGENT_STATE.md` | Persistent run state (phases, features, quality gates, artifacts) |
| `AGENT_EVALUATION.md` | Success criteria, quality checks, failure modes, metrics |
| `AGENT_CONFIG.md` | Model settings, tool bindings, safety boundaries, stack defaults |
| `README_AGENTS.md` | This file |

## How to Use

1. **Pick your framework** — LangChain, AutoGen, CrewAI, or custom code that can call tools and read a system prompt.
2. **Load `AGENT_SYSTEM_PROMPT.md`** as the system instruction for your agent.
3. **Bind `AGENT_TOOLS.md`** to real functions (file system, terminal, git, package manager, etc.).
4. **Give the agent an app idea** — e.g., "Build a task management app with user auth and team workspaces."
5. **Run through the 8 phases** — the agent updates `AGENT_STATE.md` after each step.
6. **Evaluate** — grade the result with `AGENT_EVALUATION.md`.

## Example: First Run

User says: *"Build a URL shortener with custom aliases and click analytics."*

Agent flow:
1. **Requirements** — Writes `SPEC.md`: create short links, custom aliases, view click counts, redirect endpoint.
2. **Architecture** — Picks Next.js + PostgreSQL + Prisma, deploys to Vercel.
3. **Setup** — `git init`, `npm install`, configures ESLint + Prettier, first commit.
4. **Implement** — Builds API routes (`/api/shorten`, `/api/links/[id]`), frontend form, database schema.
5. **Test** — Writes Jest + Playwright tests, runs `npm test`.
6. **Review** — Self-review, fixes edge cases, commits.
7. **Deploy** — Deploys to Vercel staging, asks user before production.
8. **Document** — Writes `README.md` with setup and env vars.

## Suggested First Project

Start small: a CRUD app with auth (e.g., notes app, expense tracker, book library).  
Once that ships reliably, expand to multi-tenant SaaS, real-time features, or mobile.

## Next Step

Tell me:
1. What app do you want to build first?
2. What's your preferred tech stack (or should I choose)?
3. Which agent framework are you using (LangChain, AutoGen, CrewAI, custom)?

I'll help you wire these templates into working agent code.

---

*Start with one app, one stack, one deployment target. Expand once the loop is reliable.*