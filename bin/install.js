#!/usr/bin/env node
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO = process.env.CANDIDE_SKILLS_REPO || 'https://github.com/candidelabs/skills';
const DIR = process.env.CANDIDE_SKILLS_DIR || path.join(os.homedir(), '.candide-skills');

const run = (file, args, cwd) =>
  execFileSync(file, args, { stdio: 'inherit', cwd });

if (fs.existsSync(path.join(DIR, '.git'))) {
  console.log(`Updating ${DIR}`);
  run('git', ['-C', DIR, 'pull', '--ff-only']);
} else if (fs.existsSync(DIR)) {
  console.error(`ERROR: ${DIR} exists but is not a git clone.`);
  console.error('Remove it or set CANDIDE_SKILLS_DIR to a different path.');
  process.exit(1);
} else {
  console.log(`Cloning ${REPO} into ${DIR}`);
  run('git', ['clone', REPO, DIR]);
}

const codexInstaller = path.join(DIR, '.codex/scripts/install-for-codex.sh');
if (fs.existsSync(codexInstaller)) {
  run('bash', [codexInstaller]);
}
