#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${CANDIDE_SKILLS_REPO:-https://github.com/candidelabs/skills}"
INSTALL_DIR="${CANDIDE_SKILLS_DIR:-$HOME/.candide-skills}"

if [ -d "${INSTALL_DIR}/.git" ]; then
  echo "Updating ${INSTALL_DIR}"
  git -C "${INSTALL_DIR}" pull --ff-only
elif [ -e "${INSTALL_DIR}" ]; then
  echo "ERROR: ${INSTALL_DIR} exists but is not a git clone." >&2
  echo "Remove it or set CANDIDE_SKILLS_DIR to a different path." >&2
  exit 1
else
  echo "Cloning ${REPO_URL} into ${INSTALL_DIR}"
  git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

CODEX_INSTALLER="${INSTALL_DIR}/.codex/scripts/install-for-codex.sh"
if [ -x "${CODEX_INSTALLER}" ]; then
  "${CODEX_INSTALLER}"
fi
