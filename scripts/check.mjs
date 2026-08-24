/**
 * House style, as a check that fails.
 *
 * One connector: the spaced hyphen. Nine characters are banned outright, and
 * intending to remember is not a strategy -- this has been swept by hand more
 * than once and come back every time. Run by `npm run check`, and by `npm test`.
 *
 * TWO THINGS TO GET RIGHT IF THIS IS EVER EDITED, both learned the hard way:
 *
 *  1. THE PATTERNS ARE BUILT FROM ESCAPE SEQUENCES, never written as literal
 *     characters. Written literally, this file's own source contains every
 *     character it bans and it reports itself on every clean run, which is how
 *     a check becomes noise that people skip.
 *  2. IT SCANS SOURCES, and sources are not the whole story. `&mdash;` is an
 *     entity here and a dash once rendered, so the built output is worth a look
 *     too. Dependencies ship their own: viem's error strings contain em dashes,
 *     so the target there is zero OF OURS rather than zero absolute.
 *
 * The replacements are all plain ASCII and are substitutions, never deletions.
 * Deleting a character that was carrying meaning is how a truncated address
 * once turned into valid hex that read as a whole one.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/* fileURLToPath, not `.pathname`: this repo lives under a directory with a
   space in its name, and the raw pathname keeps it percent-encoded. */
const ROOT = fileURLToPath(new URL("..", import.meta.url));

const BANNED = [
  ["—", "em dash", " - "],
  ["–", "en dash", " - "],
  ["‐", "hyphen", "-"],
  ["‒", "figure dash", "-"],
  ["―", "horizontal bar", "-"],
  ["−", "minus sign", "-"],
  ["·", "middle dot", " - "],
  ["•", "bullet", "-"],
  ["…", "ellipsis", "..."],
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "out",
  "build",
  "__pycache__",
  "fixtures",
]);

const EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".css", ".py", ".md", ".json", ".html", ".svg"];

/**
 * Files where one of these characters is doing a job.
 *
 * Exempted BY EXACT PATH rather than by pattern, so a new use anywhere else
 * still fails and adding a tenth is a decision somebody makes on purpose.
 */
const EXEMPT = new Set([
  // This file names all nine in order to ban them.
  join("scripts", "check.mjs"),

]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTENSIONS.some((ext) => entry.endsWith(ext))) yield full;
  }
}

let files = 0;
let total = 0;
const hits = [];

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).split("/").join(sep);
  if (EXEMPT.has(rel)) continue;
  files += 1;
  const source = readFileSync(file, "utf8");
  for (const [char, name] of BANNED) {
    let index = source.indexOf(char);
    while (index !== -1) {
      total += 1;
      const line = source.slice(0, index).split("\n").length;
      hits.push({ rel, line, name });
      index = source.indexOf(char, index + 1);
    }
  }
}

if (total === 0) {
  console.log(`clean  (${BANNED.length} characters checked across ${files} files)`);
  process.exit(0);
}

const byFile = new Map();
for (const hit of hits) {
  if (!byFile.has(hit.rel)) byFile.set(hit.rel, []);
  byFile.get(hit.rel).push(hit);
}

console.error(`${total} banned characters in ${byFile.size} files:\n`);
for (const [rel, list] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
  const counts = new Map();
  for (const hit of list) counts.set(hit.name, (counts.get(hit.name) ?? 0) + 1);
  const summary = [...counts].map(([name, n]) => `${n} ${name}${n > 1 ? "s" : ""}`).join(", ");
  console.error(`  ${rel}  ${summary}  (first at line ${list[0].line})`);
}
console.error("\nThe connector is a spaced hyphen. The ellipsis is three periods.");
process.exit(1);
