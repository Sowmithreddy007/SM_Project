# Agent Evaluation — Software Development Agent

> Criteria for judging whether an end-to-end app build succeeded. Run this after each project or major milestone.

## Success Criteria (per project)

- [ ] `SPEC.md` exists with clear user stories and acceptance criteria
- [ ] `ARCHITECTURE.md` documents stack, data model, and folder structure
- [ ] Git repository initialized with meaningful commit history
- [ ] App runs locally with `npm install` (or equivalent) + start command
- [ ] Linting passes with zero errors
- [ ] Type-checking passes (if typed language)
- [ ] Unit tests cover business logic and utilities
- [ ] Integration tests cover API routes and database interactions
- [ ] End-to-end tests cover critical user flows (web/mobile apps)
- [ ] README documents setup, run, and deploy steps
- [ ] `.env.example` lists all required environment variables
- [ ] No secrets committed to repository
- [ ] Staging deployment successful (if applicable)
- [ ] Production deployment approved and verified (if applicable)

## Quality Checks

| Check | Pass/Fail | Notes |
|-------|-----------|-------|
| Spec complete and unambiguous | | |
| Architecture appropriate for scale | | |
| Project scaffold compiles | | |
| Dependencies installed correctly | | |
| Lint clean | | |
| Type check clean | | |
| Test suite green | | |
| Test coverage adequate (>80% target) | | |
| Error handling consistent | | |
| Security: no secrets in code | | |
| Security: dependencies audited | | |
| Responsive design (web apps) | | |
| Accessibility basics (WCAG AA) | | |
| README sufficient for new dev | | |
| Deploy smoke test passes | | |

## Failure Modes to Watch

1. **Vague requirements** — Agent starts coding without a spec. Fix: enforce Step 1 sign-off.
2. **Over-engineering** — Agent adds microservices, Kubernetes, etc. for a simple CRUD app. Fix: match stack to complexity.
3. **No tests** — Agent ships untested code. Fix: enforce test-gate before commit.
4. **Secret leakage** — API keys committed to git. Fix: pre-commit hook or scan before push.
5. **Silent failures** — Agent marks done without running tests. Fix: require test output in state file.
6. **Production deploy without approval** — Fix: hard boundary in `AGENT_SYSTEM_PROMPT.md`.

## Testing Procedure

1. Copy `AGENT_STATE.md` to a fresh state file for the new project.
2. Provide the app idea and (optional) preferred stack.
3. Run the agent through all 8 phases.
4. Grade against the success criteria above.
5. Log any failures below and update prompts/tools/templates accordingly.

## Improvement Log

| Date | Project | Issue | Fix | File changed |
|------|---------|-------|-----|--------------|
| | | | | |
| | | | | |

## Recommended Metrics to Track Over Time

- **Time from idea to running locally** (target: <2 hours for MVP)
- **Time from idea to production deploy** (target: <1 day for MVP)
- **Defect escape rate** (bugs found after deploy / total bugs)
- **Commit frequency** (commits per day)
- **Test coverage percentage**

---

*Review this evaluation weekly during active development and after every shipped project.*