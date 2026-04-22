# Candide Skills

This repository bundles agent skills for building on [Candide](https://candide.dev)'s smart wallet infrastructure.

Each skill in `skills/` is a self-contained `SKILL.md` that instructs an AI coding assistant on how to integrate a specific Candide product — forwarding addresses, passkey signing, smart wallet SDKs, paymasters, and recovery flows.

## Skills

- [`forwarding-address`](skills/forwarding-address/SKILL.md) — Cross-chain deposit address routing via JSON-RPC.

## Using these skills outside Claude Code

Skills are plain markdown with YAML frontmatter. Any agent that reads SKILL.md-formatted files (Codex CLI, Copilot CLI, Gemini CLI, or any custom harness) can use them.

The canonical entrypoint for each skill is `skills/<name>/SKILL.md`. The `description` frontmatter field tells the agent when to load the skill.
