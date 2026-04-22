# Installing Candide Skills for Codex

This repository primarily targets Claude plugin discovery, but it also exposes a Codex-native skill tree under `.codex/skills/` so Codex CLI users can load the same skills without manual wiring.

## Install

1. Clone the repository:
   ```sh
   git clone https://github.com/candidelabs/skills.git ~/.codex/candide-skills
   ```

2. Link the Codex-native skill directories into your Codex skills directory:
   ```sh
   ~/.codex/candide-skills/.codex/scripts/install-for-codex.sh
   ```

3. Restart Codex so it discovers the new skills.

## Verify

```sh
ls -la ~/.codex/skills | grep candide-
```

You should see one entry per skill, each prefixed with `candide-`.

## Notes

- Claude plugin support remains unchanged — see the repo `README.md` for Claude Code install.
- `.codex/skills/` contains symlinks back into `skills/` so there is a single source of truth.
- The `candide-` prefix prevents name collisions with skills from other vendors installed into the same directory.
