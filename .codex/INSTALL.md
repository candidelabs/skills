# Installing Candide Skills for Codex

This repository primarily targets Claude plugin discovery, but it also exposes a Codex-native skill tree under `.codex/skills/` so Codex CLI users can load the same skills without manual wiring.

## Install

### Option A: npx one-liner (recommended)

Requires Node 18+ and git.

```sh
npx -y github:candidelabs/skills
```

This clones the repo into `~/.candide-skills` (or `$CANDIDE_SKILLS_DIR` if set) and symlinks each skill into `~/.codex/skills/`. Re-run the same command to pull the latest changes.

### Option B: manual clone

```sh
git clone https://github.com/candidelabs/skills.git ~/.candide-skills
~/.candide-skills/.codex/scripts/install-for-codex.sh
```

Update with `git -C ~/.candide-skills pull` and re-run the script.

After either option, restart Codex so it discovers the new skills.

## Verify

```sh
ls -la ~/.codex/skills | grep candide-
```

You should see one entry per skill, each prefixed with `candide-`.

## Notes

- Claude plugin support remains unchanged — see the repo `README.md` for Claude Code install.
- `.codex/skills/` contains symlinks back into `skills/` so there is a single source of truth.
- The `candide-` prefix prevents name collisions with skills from other vendors installed into the same directory.
