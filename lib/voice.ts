/**
 * Where a library would otherwise speak for the product.
 *
 * Pure text, no imports, no chain: a dependency's error is a string problem, and
 * keeping it here means the rules can be tested without loading an RPC client.
 */

/**
 * A library's error, rewritten in the product's voice.
 *
 * viem throws multi-line strings that carry their own version number, and one of
 * them reached the refusal panel verbatim during review:
 *
 *   User rejected the request. Details: user rejected Version: viem@2.55.17
 *
 * Chapter five allows three parts and no more -- what happened, which part, what
 * follows -- and nothing in it apologises or names a dependency. A wallet
 * declining is not a failure of the submission either, so it does not read like
 * one.
 */
export function readableError(error: unknown): string {
  const raw = String((error as Error)?.message ?? error ?? "");
  const code = (error as { code?: number })?.code;

  if (code === 4001 || /user rejected|user denied|rejected the request/i.test(raw)) {
    return "Nothing was signed, so nothing was submitted. The gate above ran in this browser and cost nothing.";
  }
  if (
    /no wallet|window\.ethereum|provider/i.test(raw) &&
    /undefined|not found|unavailable/i.test(raw)
  ) {
    return "No wallet is available in this browser, so nothing can be signed. The gate above ran here and cost nothing.";
  }
  if (/insufficient funds|intrinsic gas/i.test(raw)) {
    return "The account cannot cover this transaction, so nothing was submitted.";
  }
  if (/chain|network/i.test(raw) && /mismatch|unsupported|switch/i.test(raw)) {
    return "The wallet is pointed at a different network, so nothing was submitted.";
  }
  if (/fetch failed|unknown rpc|ECONNRESET|ETIMEDOUT|socket hang up/i.test(raw)) {
    return "The node did not answer, so nothing was submitted. Nothing was spent.";
  }

  // Anything unrecognised: keep the first sentence and drop the library's
  // stack, its "Details:" tail and its version banner. Close it if the library
  // did not -- a fragment with no full stop reads as a truncated page rather
  // than as something the product meant to say.
  const first = raw.split(/\n|Details:|Version:/)[0].trim();
  if (first && first.length < 220) {
    return /[.?]$/.test(first) ? first : `${first.replace(/[,;:\s]+$/, "")}.`;
  }
  return "The submission did not land, and the node gave no reason a person could act on.";
}
