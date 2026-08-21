/**
 * The url conversion, pinned.
 *
 * This runs before the browser fetches and before the url reaches the chain,
 * so a mistake here is recorded on a permanent report. The cases that matter
 * are the ones somebody actually copies: the address bar, the Raw button, a
 * permalink with refs/heads in it, and a line-range anchor.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { rawSourceUrl, isGithubPage } from "../../lib/sourceUrl.ts";

test("the address bar's blob url becomes the raw one", () => {
  assert.equal(
    rawSourceUrl("https://github.com/meitipro/unison-labs/blob/main/contracts/unison.py"),
    "https://raw.githubusercontent.com/meitipro/unison-labs/main/contracts/unison.py",
  );
});

test("the Raw button's own link is handled too", () => {
  assert.equal(
    rawSourceUrl("https://github.com/owner/repo/raw/main/a/b.py"),
    "https://raw.githubusercontent.com/owner/repo/main/a/b.py",
  );
});

test("a refs/heads permalink keeps the branch and drops the prefix", () => {
  assert.equal(
    rawSourceUrl("https://github.com/owner/repo/blob/refs/heads/main/x.py"),
    "https://raw.githubusercontent.com/owner/repo/main/x.py",
  );
});

test("a commit sha works exactly like a branch", () => {
  const sha = "a".repeat(40);
  assert.equal(
    rawSourceUrl(`https://github.com/owner/repo/blob/${sha}/x.py`),
    `https://raw.githubusercontent.com/owner/repo/${sha}/x.py`,
  );
});

test("viewer instructions are dropped, because a validator is not a viewer", () => {
  assert.equal(
    rawSourceUrl("https://github.com/owner/repo/blob/main/x.py?plain=1#L12-L34"),
    "https://raw.githubusercontent.com/owner/repo/main/x.py",
  );
});

test("a nested path survives intact", () => {
  assert.equal(
    rawSourceUrl("https://github.com/o/r/blob/main/a/b/c/d.py"),
    "https://raw.githubusercontent.com/o/r/main/a/b/c/d.py",
  );
});

test("a url that is already raw is left exactly alone", () => {
  const raw = "https://raw.githubusercontent.com/o/r/main/x.py";
  assert.equal(rawSourceUrl(raw), raw);
  assert.equal(isGithubPage(raw), false);
});

test("anything that is not a GitHub file url passes through untouched", () => {
  for (const url of [
    "https://example.com/contract.py",
    "https://gitlab.com/o/r/-/blob/main/x.py",
    "https://github.com/owner/repo",
    "https://github.com/owner/repo/tree/main/contracts",
    "not a url at all",
    "",
  ]) {
    assert.equal(rawSourceUrl(url), url, url || "(empty)");
  }
});

test("surrounding whitespace is trimmed, since it comes from a paste", () => {
  assert.equal(
    rawSourceUrl("  https://github.com/o/r/blob/main/x.py  "),
    "https://raw.githubusercontent.com/o/r/main/x.py",
  );
});

test("isGithubPage only reports the urls that actually change", () => {
  assert.equal(isGithubPage("https://github.com/o/r/blob/main/x.py"), true);
  assert.equal(isGithubPage("https://example.com/x.py"), false);
});
