/**
 * Turning the url somebody actually has into the one a validator can fetch.
 *
 * Nobody copies a raw.githubusercontent.com address. They copy what is in the
 * address bar while they are looking at the file, which is a `blob` url that
 * serves GitHub's HTML page rather than the source. Handing that to the
 * contract means every validator fetches a page of markup, the gate finds none
 * of its six markers in it, and the submission is refused for a reason that
 * has nothing to do with the contract being reviewed.
 *
 * So the blob form is converted here, before the browser fetches anything and
 * before the url reaches the chain. What gets recorded on the report is the
 * raw url, because that is what was read.
 *
 * ONLY GITHUB, AND ONLY THE FORMS THAT ARE UNAMBIGUOUS. A general "make this
 * url raw" helper would be guesswork against every host in the world; this
 * knows two shapes and passes everything else through untouched.
 */

/** `refs/heads/main` appears in permalinks copied from the branch dropdown. */
function tidyRef(ref: string): string {
  return ref.replace(/^refs\/heads\//, "").replace(/^refs\/tags\//, "");
}

/**
 * The raw equivalent of a GitHub file url, or the input unchanged.
 *
 * Handles:
 *   github.com/owner/repo/blob/REF/path   the address bar
 *   github.com/owner/repo/raw/REF/path    the "Raw" button's own link
 *   raw.githubusercontent.com/...         already right, left alone
 *
 * A `?plain=1` or `#L12-L34` suffix is dropped: both are instructions to
 * GitHub's viewer and neither belongs in a url a validator fetches, or in the
 * url a report is filed under.
 */
export function rawSourceUrl(input: string): string {
  const text = (input || "").trim();
  if (!text) return text;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return text;
  }

  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") return text;

  const parts = url.pathname.split("/").filter(Boolean);
  // owner / repo / (blob|raw) / ref... / path...
  if (parts.length < 5) return text;
  const [owner, repo, kind, ...rest] = parts;
  if (kind !== "blob" && kind !== "raw") return text;

  // `refs/heads/main/dir/file.py` -> ref `main`, path `dir/file.py`. The ref
  // itself can contain slashes, so the marker is what tells them apart.
  let ref = rest[0];
  let path = rest.slice(1);
  if (rest[0] === "refs" && (rest[1] === "heads" || rest[1] === "tags")) {
    ref = rest[2];
    path = rest.slice(3);
  }
  if (!ref || path.length === 0) return text;

  return `https://raw.githubusercontent.com/${owner}/${repo}/${tidyRef(ref)}/${path.join("/")}`;
}

/** True where `rawSourceUrl` would change the url, for a note on the screen. */
export function isGithubPage(input: string): boolean {
  return rawSourceUrl(input) !== (input || "").trim();
}
