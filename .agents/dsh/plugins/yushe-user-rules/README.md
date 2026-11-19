# yushe-user-rules

Injects project rules into dsh model context with priority across tool
conventions and optional frontmatter gating.

## Rules directory priority

Scanned at the project root (= nearest `.git` ancestor of the session cwd),
first present wins — later directories are not read:

1. `.agents/rules/`
2. `.claude/rules/` (Claude Code)
3. `.opencode/rule/` (OpenCode)
4. `.cursor/rules/` (Cursor)

"Present" means the directory contains at least one rule file, so an empty
or settings-only `.claude/` does not block the OpenCode or Cursor tiers.

## Rule files

Markdown files (`.md`, or Cursor's `.mdc`), recursive; symlinks to files are
followed, hidden and `node_modules` directories are skipped. Optional YAML
frontmatter:

```yaml
---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
```

- **No gate** — injected unconditionally at the session's first model request.
  Cursor's `alwaysApply: true` does the same.
- **With a gate** — injected at the first model request *after* the agent
  reads, writes, or edits a file matching any glob (project-relative path).
  The key may be `paths` or Cursor's `globs` (whose bare scalar may be a
  comma-separated list). Globs support `**`, `*`, `?`, `{a,b}`, and `[abc]` /
  `[a-z]` / `[!a-z]`; no negation or extglobs. An uncompilable glob falls
  back to unconditional loading with a logged warning.
- Only gate keys are interpreted (inline array, single scalar, or block dash
  list). Other frontmatter keys are ignored; keep gate lines free of trailing
  comments.
- Each rule is injected at most once per session; edits mid-session apply to
  the next session.

Rendering: files sorted by path, stripped of frontmatter, one
`<system-reminder>` frame per injection batch, spliced after the direct
prompt (KV-cache friendly). Budget: 64 KiB per message, 1 MiB per file;
budget-omitted files are listed in a marker. Subagents get rules for their
own sessions.

## Install / remove (web profile)

```sh
dsh plugin --profile web add ~/.dsh/plugins/yushe-user-rules
dsh plugin --profile web remove yushe-user-rules
```

Restart the profile after install or edits. Recorded sessions keep their
historical injected messages and remain replayable.

## Tuning

Edit `index.js` top constants: `RULES_ROOTS` (order and candidates),
`MAX_TOTAL_BYTES`, `MAX_FILE_BYTES`.
