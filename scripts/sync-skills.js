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

const tmp = `${dest}.tmp-${process.pid}`;
const backup = `${dest}.bak-${process.pid}`;
const destExists = fs.existsSync(dest);

fs.rmSync(tmp, { recursive: true, force: true });
fs.cpSync(src, tmp, { recursive: true });

let movedToBackup = false;
try {
  if (destExists) {
    fs.renameSync(dest, backup);
    movedToBackup = true;
  }
  fs.renameSync(tmp, dest);
} catch (err) {
  if (movedToBackup) fs.renameSync(backup, dest);
  console.warn(`sync-skills: failed to sync ${src} -> ${dest}, skipping (${err.message})`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
  if (movedToBackup) fs.rmSync(backup, { recursive: true, force: true });
}

console.log(`sync-skills: synced ${src} -> ${dest}`);
