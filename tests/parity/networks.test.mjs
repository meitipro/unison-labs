/**
 * The deploy targets, pinned.
 *
 * Every id here was read from the network itself with `eth_chainId` before it
 * was written down: studionet answered 0xf22f, Studio Next 0xf22d, and Asimov
 * and Bradbury both answered 0x107d. These tests keep the table honest to what
 * the nodes said, without asking them again on every run.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEPLOY_TARGETS,
  DEFAULT_TARGET_ID,
  addChainParams,
  chainIdHex,
  explorerAddressOn,
  explorerTxOn,
  labelForChainId,
  targetByChainId,
  targetById,
} from "../../lib/networks.ts";

const byId = Object.fromEntries(DEPLOY_TARGETS.map((t) => [t.id, t]));

test("the four networks carry the chain ids their nodes report", () => {
  assert.equal(DEPLOY_TARGETS.length, 4);
  assert.equal(byId["studionet"].chainId, 61999);
  assert.equal(byId["studio-next"].chainId, 61997);
  assert.equal(byId["asimov"].chainId, 4221);
  assert.equal(byId["bradbury"].chainId, 4221);
});

test("only Studio Next runs the newer consensus", () => {
  const newer = DEPLOY_TARGETS.filter((t) => t.runtime === "v06").map((t) => t.id);
  assert.deepEqual(newer, ["studio-next"]);
});

test("a shared chain id resolves to no single network", () => {
  // Asimov and Bradbury are told apart by the node a deploy is sent to, never
  // by the wallet, and nothing in the product may pretend otherwise.
  assert.equal(targetByChainId(4221), null);
  assert.equal(targetByChainId(61997).id, "studio-next");
  assert.equal(targetByChainId(61999).id, "studionet");
});

test("every target has its own rpc, and no two share one", () => {
  const rpcs = DEPLOY_TARGETS.map((t) => t.rpc);
  assert.equal(new Set(rpcs).size, rpcs.length);
  for (const rpc of rpcs) assert.match(rpc, /^https:\/\//);
});

test("the default target exists", () => {
  assert.ok(targetById(DEFAULT_TARGET_ID));
  assert.equal(targetById("not-a-network"), null);
});

test("a wallet is handed the target's own node, not the site's", () => {
  const params = addChainParams(byId["bradbury"]);
  assert.equal(params.chainId, "0x107d");
  assert.deepEqual(params.rpcUrls, ["https://rpc-bradbury.genlayer.com"]);
  assert.deepEqual(params.blockExplorerUrls, ["https://explorer-bradbury.genlayer.com"]);
  assert.equal(params.nativeCurrency.symbol, "GEN");
});

test("chain ids are written the way a wallet asks for them", () => {
  assert.equal(chainIdHex(byId["studionet"]), "0xf22f");
  assert.equal(chainIdHex(byId["studio-next"]), "0xf22d");
});

test("explorer links are built per network, and skipped where there is none", () => {
  assert.equal(
    explorerAddressOn(byId["studio-next"], "0xabc"),
    "https://explorer-studio-dev.genlayer.com/address/0xabc",
  );
  assert.equal(explorerTxOn(byId["asimov"], "0xdef"), "https://explorer-asimov.genlayer.com/tx/0xdef");
  const none = { ...byId["asimov"], explorer: "" };
  assert.equal(explorerAddressOn(none, "0xabc"), "");
  assert.equal(explorerTxOn(none, "0xabc"), "");
});

test("every target says the one thing worth knowing before it is chosen", () => {
  for (const t of DEPLOY_TARGETS) {
    assert.ok(t.note.length > 20, `${t.id} has no note`);
    assert.ok(t.label.length > 0);
  }
});

test("a chain id can always be named, and 4221 names both", () => {
  // No message in this product may say "a different network" to somebody
  // looking at the right one, so every id has to come back as something a
  // person can compare against what their wallet shows.
  assert.equal(labelForChainId(61999), "Studio");
  assert.equal(labelForChainId("0xf22f"), "Studio");
  assert.equal(labelForChainId(61997), "Studio Next");
  assert.equal(labelForChainId("0xf22d"), "Studio Next");
  assert.equal(labelForChainId(4221), "Asimov or Bradbury");
  assert.equal(labelForChainId(61127), "a local node");
  assert.equal(labelForChainId(999), "chain 999");
  assert.equal(labelForChainId("not a number"), "an unknown network");
});
