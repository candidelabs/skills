# Candide Skills

Agent skills for building on [Candide](https://candide.dev) — smart wallet infrastructure for EVM chains. These skills teach AI coding assistants how to correctly integrate Candide's products: forwarding addresses, passkey signing, smart wallet SDKs, paymasters, and recovery flows.

## What's in here

Each folder under `skills/` is a single self-contained skill. A skill is a `SKILL.md` file with YAML frontmatter — the `description` field tells the agent when to load the skill, and the body teaches it how to do the task correctly (API methods, gotchas, validation rules, hard rules).

| Skill | What it covers |
|-------|---------------|
| [`forwarding-address`](skills/forwarding-address/SKILL.md) | Cross-chain deposit address routing with deterministic addresses and custodial recovery |

More skills coming. See [Roadmap](#roadmap).

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

Codex reads project-level context from `AGENTS.md` and skills from `.agents/skills/`. Clone this repo and link skills into your project:

```bash
git clone https://github.com/candidelabs/skills ~/.candide-skills
mkdir -p .agents/skills
ln -s ~/.candide-skills/skills/* .agents/skills/
```

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

## Roadmap

Planned skills (open an issue to request priority):

- `smart-wallet-mobile` — AbstractionKit in React Native / iOS / Swift
- `passkey-signing` — WebAuthn + secp256r1 signing for smart accounts
- `passkey-recovery` — Account recovery flows using passkeys
- `paymaster-integration` — Gasless transactions via Candide's paymaster
- `eip-7702` — Delegating EOAs to smart contract code
- `userop-signing` — Constructing and signing ERC-4337 UserOperations
- `bundler-client` — Direct bundler RPC usage

## Contributing

Skills live in `skills/<name>/SKILL.md`. When adding a new skill:

1. Write a tight `description` — this is what the agent matches against to decide whether to load the skill. Lead with the concrete task, then list trigger keywords.
2. Keep `SKILL.md` focused. If reference material gets long, split into sibling files (e.g., `reference.md`, `examples/`) and link from `SKILL.md`.
3. Include **hard rules** and **common mistakes** sections — these are the most valuable output for agents.
4. Register the skill in `.claude-plugin/marketplace.json` if it should ship as part of the plugin.

## License

MIT — see [LICENSE](LICENSE).
