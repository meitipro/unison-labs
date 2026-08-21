/**
 * Run genvm-lint over the contract.
 *
 *   npm run lint:contract
 *
 * Wrapped rather than called directly, because two Windows details turn a
 * passing contract into a failing one:
 *
 *  1. The linter prints a U+2713 tick and dies on it under the cp1252 stdout a
 *     child process inherits, so the child needs PYTHONIOENCODING=utf-8.
 *  2. Never spawn it through a shell. These repos live under "GenLayer Works"
 *     and the shell splits the path on the space, so the linter reports
 *     `unrecognized arguments: Works\...\unison.py` for every file.
 *
 * `check` runs both halves: the AST pass, and the deeper one that loads the
 * contract against the SDK.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTRACT = join(HERE, "..", "contracts", "unison.py");

const result = spawnSync("genvm-lint", ["check", CONTRACT], {
  stdio: "inherit",
  env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  // No `shell: true`. See the note above.
  shell: false,
});

if (result.error) {
  console.error(
    `\n  Could not run genvm-lint: ${result.error.message}\n` +
      "  Install it with:  pip install genvm-linter\n",
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
