# Agent Configuration — Software Development

> Framework-agnostic config. Fill in values for your agent platform (LangChain, AutoGen, CrewAI, custom, etc.).

## Agent Identity

- **Name:** End-to-End App Builder
- **Version:** 1.0.0
- **Description:** Autonomous software engineering agent that builds apps from idea to deployment

## Model Settings

- **Model:** [e.g., gpt-5, claude-opus-4, nemotron]
- **Temperature:** 0.2 (low for deterministic coding)
- **Max tokens:** 8000
- **System prompt file:** `AGENT_SYSTEM_PROMPT.md`
- **Max thinking steps:** 50

## Workflow Settings

- **Workflow file:** `AGENT_WORKFLOW.md`
- **State file:** `AGENT_STATE.md`
- **Max phases per run:** 8
- **Max steps per feature:** 10
- **Max retries per tool call:** 3
- **Command timeout (seconds):** 120
- **Test timeout (seconds):** 300

## Ask User Before

- [ ] Deleting files
- [ ] Deploying to production
- [ ] Creating cloud resources (databases, buckets, etc.)
- [ ] Installing paid services or subscriptions
- [ ] Pushing to `main` / `master` branch
- [ ] Running destructive commands (`rm`, `drop database`, etc.)

## Tool Bindings

| Tool name | Framework function | Enabled |
|-----------|-------------------|---------|
| `read_file` | `fs.readFile` / equivalent | true |
| `write_file` | `fs.writeFile` / equivalent | true |
| `list_directory` | `fs.readdir` / equivalent | true |
| `create_directory` | `fs.mkdir` / equivalent | true |
| `delete_file` | `fs.unlink` / equivalent | true |
| `run_command` | `child_process.exec` / equivalent | true |
| `install_package` | npm/pip wrapper | true |
| `git_commit` | git wrapper | true |
| `search_web` | web search tool | true |
| `run_tests` | test runner wrapper | true |

## Project Boundaries

- **Allowed directories:** `[PROJECT_ROOT]`, `[PROJECT_ROOT]/**`
- **Blocked paths:** `~/.ssh`, `/etc`, `C:\Windows`, any path outside project root
- **Blocked domains:** None by default
- **Require .env for:** database URLs, API keys, secrets

## Recommended Tech Stacks (Defaults)

| App Type | Frontend | Backend | Database | Auth | Deploy |
|----------|----------|---------|----------|------|--------|
| SaaS web app | Next.js + Tailwind | Next.js API / Node | PostgreSQL | NextAuth / Clerk | Vercel |
| API-only | — | FastAPI / Node | PostgreSQL | JWT / OAuth | Railway / Fly.io |
| Mobile | React Native / Flutter | Node / Python | PostgreSQL / Supabase | Auth0 / Firebase | Expo / App Store |
| CLI tool | — | Node / Python | SQLite | — | npm / pip |
| Internal dashboard | React / Vue | Node / Python | PostgreSQL | Session-based | Vercel / Docker |

## Notifications

- **On phase complete:** Log to `AGENT_STATE.md`
- **On blocker:** Immediate message to user
- **On deploy complete:** Message with URL and smoke test results
- **On run complete:** Summary of all artifacts and URLs

---

*Copy this file per project if different projects need different stacks or approvals.*