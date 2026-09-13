/**
 * An Address argument, built the only way genlayer-js leaves open.
 *
 * GenVM takes an Address as twenty raw bytes behind a one byte tag, and the
 * encoder only writes that tag for an instance of its own `CalldataAddress`
 * class, checked with `instanceof`. That class is not exported: the package's
 * public calldata surface is `abi.calldata.{encode, decode, makeCalldataObject,
 * toString}` and nothing else. A hex string goes out as a str and a Uint8Array
 * as bytes, and a constructor annotated `Address` refuses both.
 *
 * `decode` is public, and it builds a genuine `CalldataAddress` when it reads
 * the address tag. So the instance comes from decoding the tag and the bytes,
 * and is then encoded straight back and compared byte for byte, so that if a
 * later genlayer-js ever moves the tag this refuses loudly instead of sending a
 * value of the wrong type.
 *
 * A leaf module with no relative imports, so tests/parity runs it against the
 * real encoder rather than a stand-in.
 */

import { abi } from "genlayer-js";

/**
 * `SPECIAL_ADDR` in genlayer-js's calldata constants, which is
 * `3 << BITS_IN_TYPE | TYPE_SPECIAL` with BITS_IN_TYPE 3 and TYPE_SPECIAL 0.
 */
const ADDRESS_TAG = 24;

export function addressArg(hex: string): unknown {
  const clean = (hex || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(clean)) {
    throw new Error("An address is 0x followed by 40 hex characters.");
  }
  const raw = new Uint8Array(21);
  raw[0] = ADDRESS_TAG;
  for (let i = 0; i < 20; i += 1) {
    raw[i + 1] = parseInt(clean.slice(2 + i * 2, 4 + i * 2), 16);
  }
  const value = abi.calldata.decode(raw);
  const back = abi.calldata.encode(value);
  if (back.length !== raw.length || back.some((b, i) => b !== raw[i])) {
    throw new Error("This genlayer-js encodes addresses differently, so the address was not sent.");
  }
  return value;
}
