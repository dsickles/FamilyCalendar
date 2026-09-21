# Agent instructions

This repo is Spec Kit + Next.js 16. Specs in `.spec/` and `.specify/` are agent-agnostic. Cursor skills live in `.cursor/skills/`; Claude Code loads this file via `CLAUDE.md`.

## Spec Kit integration

This project was initialized for Cursor (`.cursor/skills/speckit-*`). To use Spec Kit in Claude Code:

```bash
specify integration install claude
```

That adds `.claude/skills/` without rewriting the app. Then use `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, and the other speckit skills.

## Phase review gates

Each documentation slice and each implementation slice is a **hard stop**. The human reviews it, then starts a **new chat** for the next slice. Do not keep stacking phases in one context window.

### What counts as a phase

- Writing or amending constitution, project context, a specification, or a task list
- Implementing one numbered feature slice (e.g. Phase 1, Phase 1.5, Phase 2)
- A verification gate for that slice

### After finishing a phase

1. Summarize what was written or built.
2. Tell the human what to review (paths).
3. **Stop.** Do not start the next spec, the next phase, or any application code.

### Approval is not implementation

- "Looks good" / "approve the spec files" means **stamp the docs only**.
- Implementation starts only on an explicit instruction: "implement Phase 1", "run T001", "start scaffolding".
- Do not treat spec approval, task-list approval, or "that works" as a green light to code.

### New chat for the next phase

When the human is ready for the next slice, tell them to open a **new chat** and point at the approved `.spec` files. Do not continue the next phase in the current thread.

```text
❌ BAD — spec approved, immediately run create-next-app and Phase 1.5 in the same chat
✅ GOOD — spec approved, stop: "Review these four files. If you want code next, start a new chat and say implement Phase 1."
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
