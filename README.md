# Candide Skills

Agent skills for building on [Candide](https://candide.dev) — smart wallet infrastructure for EVM chains. These skills teach AI coding assistants how to correctly integrate Candide's products: forwarding addresses, passkey signing, smart wallet SDKs, paymasters, and recovery flows.

## What's in here

Each folder under `skills/` is a single self-contained skill. A skill is a `SKILL.md` file with YAML frontmatter — the `description` field tells the agent when to load the skill, and the body teaches it how to do the task correctly (API methods, gotchas, validation rules, hard rules).

| Skill | What it covers |
|-------|---------------|
| [`forwarding-address`](skills/forwarding-address/SKILL.md) | Cross-chain deposit address routing with deterministic addresses and custodial recovery |
| [`safe-unified-account`](skills/safe-unified-account/SKILL.md) | Multichain smart accounts with abstractionkit — one signature executes across every EVM chain |

## Install

### Claude Code

```
/plugin marketplace add candidelabs/skills
/plugin install candide@candide
```

Or install directly from this repo:

```
/plugin install https://github.com/candidelabs/skills
```

### GitHub Copilot CLI

Copilot CLI auto-discovers skills in `.agents/skills/` and `~/.agents/skills/`. Either clone this repo into `~/.agents/skills/candide/` or symlink the `skills/` directory.

```bash
git clone https://github.com/candidelabs/skills ~/.candide-skills
ln -s ~/.candide-skills/skills/* ~/.agents/skills/
```

### OpenAI Codex CLI

This repo exposes a Codex-native skill tree under `.codex/skills/`. A helper script links it into your Codex skills directory with a `candide-` prefix to avoid collisions.

```bash
git clone https://github.com/candidelabs/skills ~/.codex/candide-skills
~/.codex/candide-skills/.codex/scripts/install-for-codex.sh
```

Full instructions: [`.codex/INSTALL.md`](.codex/INSTALL.md).

### Gemini CLI

Gemini CLI loads skills from `.gemini/skills/` and `~/.gemini/skills/`.

```bash
git clone https://github.com/candidelabs/skills ~/.candide-skills
mkdir -p ~/.gemini/skills
ln -s ~/.candide-skills/skills/* ~/.gemini/skills/
```

### Other agents

Any harness that consumes SKILL.md-formatted files can use these skills directly. Point your agent at `skills/<name>/SKILL.md`.

## How skills work

Skills use **progressive disclosure** — the agent reads only the `description` frontmatter until it decides a skill is relevant, then loads the full SKILL.md body into context. Inactive skills cost effectively zero tokens, so adding more skills to this bundle does not degrade performance.

Skills are **procedural knowledge** — they tell the agent *how* to build something correctly. They complement, rather than replace:
- **MCP servers** (runtime tools for live data — e.g., querying a bundler)
- **SDKs** (the actual code libraries devs import — `abstractionkit`, etc.)
- **Docs** (reference material for humans)

## Contributing

See [`CLAUDE.md`](CLAUDE.md) for the full contributor guide — repo layout, skill authoring conventions, and pre-commit checklist.

## License

MIT — see [LICENSE](LICENSE).
