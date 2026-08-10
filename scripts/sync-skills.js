// Regenerates .windsurf/skills from .claude/skills, which is the tracked
// source of truth. .windsurf/skills is gitignored since it was previously
// committed as a byte-for-byte duplicate.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", ".claude", "skills");
const dest = path.join(__dirname, "..", ".windsurf", "skills");

if (!fs.existsSync(src)) {
  console.warn(`sync-skills: source ${src} not found, skipping`);
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

console.log(`sync-skills: synced ${src} -> ${dest}`);
