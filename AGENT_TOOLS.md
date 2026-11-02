# Agent Tool Definitions — Software Development

> Map these tool names to actual functions in your agent framework (LangChain, AutoGen, CrewAI, custom, etc.).

---

## Tool: read_file

**Purpose:** Read the contents of a source file, config file, or documentation.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Relative or absolute path to the file |

**Example call:**
```
read_file({ "path": "src/components/Button.tsx" })
```

**When to use:** Inspecting existing code, configs, package.json, error logs.  
**When NOT to use:** Do not read files outside the project directory.

---

## Tool: write_file

**Purpose:** Create or overwrite a source file, config, or documentation.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | File path to write |
| `content` | string | Yes | Full file contents |

**Example call:**
```
write_file({ "path": "src/utils/helpers.ts", "content": "export function formatDate(...) {...}" })
```

**When to use:** Writing new components, APIs, configs, READMEs.  
**When NOT to use:** Do not overwrite `package-lock.json` or `yarn.lock` manually — use `install_package` instead.

---

## Tool: list_directory

**Purpose:** List files and subdirectories in a folder.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | No | Directory path (defaults to project root) |

**Example call:**
```
list_directory({ "path": "src" })
```

**When to use:** Exploring project structure before making changes.  
**When NOT to use:** N/A

---

## Tool: create_directory

**Purpose:** Create a new folder.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Directory path to create |

**Example call:**
```
create_directory({ "path": "src/features/auth" })
```

**When to use:** Structuring new feature folders.  
**When NOT to use:** N/A

---

## Tool: delete_file

**Purpose:** Remove a file from the project.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | File path to delete |

**Example call:**
```
delete_file({ "path": "src/components/OldComponent.tsx" })
```

**When to use:** Removing dead code or unused files.  
**When NOT to use:** Requires explicit user approval. Never delete `.git`, `package.json`, or lock files.

---

## Tool: run_command

**Purpose:** Execute shell commands in the project directory.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | Yes | Shell command to run |
| `timeout` | number | No | Max seconds to wait (default 120) |

**Example calls:**
```
run_command({ "command": "npm install" })
run_command({ "command": "npm test -- --watchAll=false" })
run_command({ "command": "git status" })
run_command({ "command": "npx tsc --noEmit" })
```

**When to use:** Installing deps, running tests, linting, building, git operations.  
**When NOT to use:** Do not run `rm -rf`, `curl | bash`, or install unvetted global packages without approval.

---

## Tool: install_package

**Purpose:** Install a dependency using the project's package manager.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `package` | string | Yes | Package name (and optional version) |
| `dev` | boolean | No | Install as devDependency (default false) |
| `manager` | string | No | `npm`, `yarn`, `pnpm`, `pip`, `cargo` (auto-detected) |

**Example calls:**
```
install_package({ "package": "react", "manager": "npm" })
install_package({ "package": "@types/node", "dev": true, "manager": "npm" })
install_package({ "package": "fastapi", "manager": "pip" })
```

**When to use:** Adding libraries to the project.  
**When NOT to use:** Do not install packages with known security vulnerabilities without flagging to user.

---

## Tool: git_commit

**Purpose:** Stage changes and create a commit.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | Commit message (conventional style preferred) |
| `add_all` | boolean | No | `git add -A` before commit (default true) |

**Example call:**
```
git_commit({ "message": "feat(auth): add login and logout endpoints" })
```

**When to use:** After completing a logical unit of work.  
**When NOT to use:** Do not commit secrets or `.env` files with real values.

---

## Tool: search_web

**Purpose:** Search the web for documentation, error solutions, or best practices.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `num_results` | number | No | Max results to return (default 5) |

**Example call:**
```
search_web({ "query": "Next.js 15 app router server actions authentication pattern" })
```

**When to use:** Looking up API docs, solving errors, checking library usage.  
**When NOT to use:** Do not search for or retrieve paid/copyrighted code.

---

## Tool: run_tests

**Purpose:** Execute the project's test suite.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | No | Test command (auto-detected if omitted) |
| `pattern` | string | No | Run only tests matching this pattern |

**Example call:**
```
run_tests({ "command": "npm test", "pattern": "auth" })
```

**When to use:** Verifying code correctness after changes.  
**When NOT to use:** N/A

---

## Tool Selection Rules

1. **Match tool to phase:** Use `read_file`/`list_directory` in Requirements; `write_file`/`run_command` in Implement; `run_tests` in Test; `git_commit` after each feature.
2. **Verify before commit:** Always run tests and lint before `git_commit`.
3. **One tool per step:** Prefer small, verifiable tool calls over large batches.
4. **Approval required:** `delete_file`, production deployment, installing paid services.

---

*Bind these names to your framework's actual function implementations (e.g., `fs.readFile`, `child_process.exec`, `octokit`, etc.).*