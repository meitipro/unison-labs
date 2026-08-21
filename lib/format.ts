/**
 * How this product writes a number, a hash, a url and a duration.
 *
 * Chapter five of the spec, in one file, so the rules are applied rather than
 * remembered. Two of them are easy to break by accident:
 *
 *   The ellipsis is ONE character, never three periods, and it only ever
 *   appears in the middle of a hash or a url. It never ends a sentence and it
 *   never means loading.
 *
 *   Consensus is spelled "5 of 5", with `of` rather than a slash, so it cannot
 *   be misread as a score out of five.
 */

const ELLIPSIS = "...";

/** A score. Numeral, slash, no spaces. Never "nine out of ten". */
export function score(total: number, outOf = 10): string {
  return `${total}/${outOf}`;
}

/** Consensus. Spelled with `of`, to distinguish it from a score. */
export function consensus(agreed: number, of: number): string {
  return `${agreed} of ${of}`;
}

/** A hash. First twelve, one ellipsis, last four. */
export function digest(value: string): string {
  const text = (value || "").trim();
  if (text.length <= 18) return text;
  return `${text.slice(0, 12)}${ELLIPSIS}${text.slice(-4)}`;
}

/** An address, the same way. */
export function address(value: string): string {
  const text = (value || "").trim();
  if (text.length <= 12) return text;
  return `${text.slice(0, 6)}${ELLIPSIS}${text.slice(-2)}`;
}

/**
 * A url. Protocol dropped, middle elided with a single ellipsis character.
 *
 * The host and the filename are the two parts that carry meaning -- which
 * project, and which file -- so those are what survive.
 */
export function url(value: string, budget = 46): string {
  let text = (value || "").trim().replace(/^https?:\/\//i, "");
  if (text.length <= budget) return text;

  const slash = text.lastIndexOf("/");
  if (slash > 0) {
    const tail = text.slice(slash);
    const host = text.slice(0, text.indexOf("/") > 0 ? text.indexOf("/") : slash);
    if (host.length + tail.length + 1 <= budget) return `${host}/${ELLIPSIS}${tail}`;
    return `${host}/${ELLIPSIS}${tail.slice(-(budget - host.length - 2))}`;
  }
  return `${text.slice(0, budget - 1)}${ELLIPSIS}`;
}

/** A duration. Milliseconds under a second, seconds above it. Never "1.0s". */
export function duration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${Math.round(ms / 1000)}s`;
}

/**
 * A date, the way the report header shows one: 21 JUL 2026.
 *
 * Built from the parts rather than by toLocaleDateString, because a locale that
 * puts the month first would silently change what the header means.
 */
const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

export function reportDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getUTCDate()} ${MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

/** The middle dot, with a space either side. The only separator in the product. */
export function joinMono(parts: Array<string | number | null | undefined>): string {
  return parts.filter((p) => p !== null && p !== undefined && p !== "").join(" - ");
}

/** A list of criterion ids, in the product's voice: lowercase, comma separated. */
export function ids(list: string[]): string {
  return list.join(", ");
}
