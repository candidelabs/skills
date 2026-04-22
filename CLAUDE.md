# Contributing to Candide Skills

This file is guidance for anyone (human or agent) adding or editing skills in this repo.

## Resources to read first

**Anthropic official docs:**
- [Agent Skills](https://code.claude.com/docs/en/skills) — format, progressive disclosure, best practices
- [Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — degrees of freedom, workflow checklists
- [Claude Code Plugins](https://code.claude.com/docs/en/plugins) — how plugins and marketplaces work

**Reference repos worth studying before authoring:**
- [anthropics/skills](https://github.com/anthropics/skills) — canonical examples
- [trailofbits/skills](https://github.com/trailofbits/skills) — large multi-plugin monorepo, Codex compatibility pattern
- [getsentry/skills](https://github.com/getsentry/skills) — production-grade routing + progressive disclosure

## Current layout

One plugin (`candide`), many skills:

```
.
├── .claude-plugin/
│   ├── plugin.json         # single plugin manifest
│   └── marketplace.json    # marketplace entry
├── .codex/
│   ├── INSTALL.md
│   ├── scripts/install-for-codex.sh   # creates ~/.codex/skills/candide-* symlinks
│   └── skills/             # symlinks back into ../../skills — single source of truth
├── skills/
│   └── <skill-name>/
│       └── SKILL.md        # kebab-case name, YAML frontmatter, progressive disclosure
├── AGENTS.md               # Codex / generic-agent entrypoint
└── README.md
```

**When to split into multiple plugins** (the [trailofbits/skills](https://github.com/trailofbits/skills) model): only when a skill bundle needs its own MCP server, requires credentials not every dev wants, or naturally groups into a category with 3+ skills. Until then, keep adding to the single `candide` plugin.

## Adding a new skill

1. Create `skills/<name>/SKILL.md`.
2. Frontmatter must have `name` (kebab-case, ≤ 64 chars) and `description`.
3. Write the `description` so an agent can match it against a user's intent. Lead with the concrete task, then list trigger keywords. Bad: "Helps with wallets." Good: "Use when integrating Candide's AbstractionKit for ERC-4337 smart wallets in React Native. Triggers on mentions of smart wallet, userOp, AbstractionKit, RN, Expo."
4. Apply **progressive disclosure**: `SKILL.md` stays focused; long reference material goes in sibling files (`reference.md`, `examples/`, `scripts/`) and is linked from `SKILL.md`.
5. Include **Hard Rules** and **Common Mistakes** sections. These are the highest-leverage output for agents.
6. Add a Codex symlink: `cd .codex/skills && ln -sfn ../../skills/<name> <name>`.
7. Add a row to the skills table in `README.md`.

## Skill content conventions

- **Point to live docs for anything that changes.** Don't inline full API reference — link `https://docs.candide.dev/...` so the skill doesn't go stale. Instruct the agent to fetch the doc.
- **Ask before coding.** Good skills have a "Phase 1: Understand" section with 4–6 questions, a "Phase 2: Plan" approval gate, then "Phase 3: Implement". This prevents wasted code.
- **Validate inputs.** Include an explicit "Validation Rules" section (address regexes, amount formats, chain-id sourcing) the agent can apply before hitting the API.
- **Write in second person** ("You are integrating…"), not third person about the agent. The skill is a directive.

## Verification before committing

- [ ] `SKILL.md` has valid YAML frontmatter (at minimum `name` + `description`).
- [ ] `.codex/skills/<name>` symlink exists and points at `../../skills/<name>`.
- [ ] `README.md` skills table includes the new entry.
- [ ] No API keys, private RPC URLs, or secrets in committed files.

## Distinction to keep clear

- **Skill** = procedural markdown; teaches *how* to do something. No runtime.
- **MCP server** = live-data runtime tool (e.g., query a bundler). Not yet used in this repo.
- **Plugin** = distribution bundle containing skills and/or MCP servers and/or agents.
