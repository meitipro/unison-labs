/**
 * The wrapped 4902, pinned.
 *
 * Switching to a network the wallet already had worked; switching to Studio
 * Next, which nobody had added, did nothing and said nothing. The code that
 * means "add it first" was there the whole time, one level down.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { unknownChain } from "../../lib/walletErrors.ts";

test("the plain code, as EIP-3326 writes it", () => {
  assert.equal(unknownChain({ code: 4902 }), true);
});

test("the code MetaMask actually sends, wrapped in a -32603", () => {
  assert.equal(
    unknownChain({ code: -32603, message: "Internal JSON-RPC error.", data: { originalError: { code: 4902 } } }),
    true,
  );
});

test("a code carried on the cause", () => {
  assert.equal(unknownChain({ code: -32603, cause: { code: 4902 } }), true);
});

test("the sentence, where no code survives at all", () => {
  assert.equal(unknownChain({ message: 'Unrecognized chain ID "0xf22d". Try adding the chain using wallet_addEthereumChain first.' }), true);
});

test("a refusal is not an unknown chain", () => {
  assert.equal(unknownChain({ code: 4001, message: "User rejected the request." }), false);
  assert.equal(unknownChain({ code: -32603, message: "Internal JSON-RPC error." }), false);
  assert.equal(unknownChain(null), false);
  assert.equal(unknownChain(undefined), false);
});
