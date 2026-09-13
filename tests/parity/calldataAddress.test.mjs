/**
 * An Address constructor argument, pinned against the real encoder.
 *
 * genlayer-js does not export the class its encoder checks for, so the value
 * is built by decoding the address tag. These tests run the real package, not a
 * stand-in, because the whole risk is the encoder quietly taking a different
 * branch: a hex string encodes as a str, a Uint8Array as bytes, and either one
 * reaches a constructor annotated Address as the wrong type.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { abi } from "genlayer-js";

import { addressArg } from "../../lib/calldataAddress.ts";

const HEX = "0x914a3074d586acC7D7fB56DE605bfb26a0ca3158";
const hexOf = (bytes) => Buffer.from(bytes).toString("hex");

test("an address argument encodes as the address tag and twenty bytes", () => {
  const bytes = abi.calldata.encode(addressArg(HEX));
  assert.equal(bytes.length, 21);
  assert.equal(bytes[0], 24);
  assert.equal(hexOf(bytes.slice(1)), HEX.slice(2).toLowerCase());
});

test("it is not the str the same hex string would have been", () => {
  assert.notDeepEqual(
    Array.from(abi.calldata.encode(HEX)),
    Array.from(abi.calldata.encode(addressArg(HEX))),
  );
});

test("nor the bytes a Uint8Array would have been", () => {
  const raw = Uint8Array.from(Buffer.from(HEX.slice(2), "hex"));
  assert.notDeepEqual(
    Array.from(abi.calldata.encode(raw)),
    Array.from(abi.calldata.encode(addressArg(HEX))),
  );
});

test("a malformed address is refused before anything is encoded", () => {
  assert.throws(() => addressArg("0x1234"));
  assert.throws(() => addressArg(HEX.slice(2)));
  assert.throws(() => addressArg(`${HEX}00`));
});

test("inside constructor calldata it survives a full round trip", () => {
  const encoded = abi.calldata.encode(abi.calldata.makeCalldataObject(undefined, [addressArg(HEX)], undefined));
  const decoded = abi.calldata.decode(encoded);
  const args = decoded instanceof Map ? decoded.get("args") : decoded.args;
  assert.ok(args && args[0] && args[0].bytes, "the address comes back as an address");
  assert.equal(hexOf(args[0].bytes), HEX.slice(2).toLowerCase());
});
