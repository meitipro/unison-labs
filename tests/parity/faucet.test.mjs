/**
 * The faucet answers with a balance, not with a receipt.
 *
 * Studio has answered `sim_fundAccount` with an error while crediting the
 * account anyway, so "did it work" can only be read from the balance moving.
 * These run against a stubbed node because the question is what this code
 * concludes from each answer, not whether a public faucet is up today.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { fundFromNode, gen } from "../../lib/faucet.ts";

const ADDRESS = "0x1111111111111111111111111111111111111111";

function node({ balances, fundThrows = false }) {
  let call = 0;
  const seen = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    seen.push(body.method);
    if (body.method === "sim_fundAccount") {
      if (fundThrows) throw new Error("Internal error");
      return { json: async () => ({ result: "0xhash" }) };
    }
    const value = balances[Math.min(call++, balances.length - 1)];
    return { json: async () => (value === null ? {} : { result: value }) };
  };
  return seen;
}

test("a balance that moved is the proof, and it is reported", async () => {
  node({ balances: ["0x0", "0x8ac7230489e80000"] });
  const out = await fundFromNode("https://node.test/api", ADDRESS);
  assert.deepEqual(out, { ok: true, balance: 10000000000000000000n });
});

test("an error from the call is ignored when the balance moved anyway", async () => {
  const seen = node({ balances: ["0x0", "0x8ac7230489e80000"], fundThrows: true });
  const out = await fundFromNode("https://node.test/api", ADDRESS);
  assert.equal(out.ok, true);
  assert.ok(seen.includes("sim_fundAccount"));
});

test("a balance that did not move is not a funded account", async () => {
  node({ balances: ["0x8ac7230489e80000", "0x8ac7230489e80000"] });
  assert.deepEqual(await fundFromNode("https://node.test/api", ADDRESS), { ok: false, why: "unmoved" });
});

test("a node that will not say is not a refusal either", async () => {
  node({ balances: [null, null] });
  assert.deepEqual(await fundFromNode("https://node.test/api", ADDRESS), { ok: false, why: "unreadable" });
});

test("wei reads as GEN in a sentence", () => {
  assert.equal(gen(10000000000000000000n), "10");
  assert.equal(gen(0n), "0");
  assert.equal(gen(1500000000000000000n), "1.5");
  assert.equal(gen(1n), "0");
});
