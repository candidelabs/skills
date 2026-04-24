# Candide Skills

Agent skills for building on [Candide](https://candide.dev) — smart wallet infrastructure for EVM chains. Each skill teaches AI coding assistants (Claude Code, Codex, Copilot CLI, Gemini) how to correctly integrate one Candide product.

## Skills

| Skill | What it covers |
|-------|---------------|
| [`forwarding-address`](skills/forwarding-address/SKILL.md) | Cross-chain deposit address routing with deterministic addresses and custodial recovery |
| [`safe-unified-account`](skills/safe-unified-account/SKILL.md) | Multichain smart accounts with abstractionkit — one signature executes across every EVM chain |

## Install

**Claude Code**

```
/plugin marketplace add candidelabs/skills
/plugin install candide@candide
```

**OpenAI Codex CLI**

One-liner (requires Node + git):

```bash
npx -y github:candidelabs/skills
```

Clones the repo into `~/.candide-skills` and symlinks each skill into `~/.codex/skills/` with a `candide-` prefix. Re-run the same command to update.

Or clone manually:

```bash
git clone https://github.com/candidelabs/skills ~/.candide-skills
~/.candide-skills/.codex/scripts/install-for-codex.sh
```

**Copilot CLI / Gemini CLI / other harnesses**

Skills are plain `SKILL.md` files. Clone this repo and symlink `skills/*` into your agent's skills directory (typically `~/.agents/skills/` for Copilot CLI, `~/.gemini/skills/` for Gemini, or whatever path your harness reads).

## How it works

Skills use **progressive disclosure**: the agent reads each skill's `description` frontmatter and only loads the full body when relevant — inactive skills cost ~0 tokens. Skills are procedural knowledge (the *how*); they complement SDKs (`abstractionkit`), runtime tools (MCP servers), and reference docs.

## Contributing

See [`CLAUDE.md`](CLAUDE.md) for the contributor guide — layout, authoring conventions, pre-commit checklist.

## License

MIT — see [LICENSE](LICENSE).
