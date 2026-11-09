/**
 * The attestor: reads a finished report from the Unison contract on GenLayer and signs it for the registry
 * on Base Sepolia.
 *
 *   node scripts/anchor.mjs status <reportId>
 *   node scripts/anchor.mjs anchor <reportId> [--submit]
 *
 * Environment (names only, values are never printed):
 *   NEXT_PUBLIC_UNISON_CONTRACT   the GenLayer contract; defaults to the address in the README
 *   REGISTRY_ADDRESS              UnisonRegistry on Base Sepolia
 *   BASE_RPC_URL                  defaults to https://sepolia.base.org
 *   ATTESTOR_KEY_FILE             a JSON file with { "private_key": "0x..." }, kept outside the repository
 *   RELAYER_KEY_FILE              optional, pays gas for --submit; defaults to the attestor
 *
 * It signs what the report says and nothing else: the digest, the contract mark, the site mark if there is
 * one, and the rubric version. The signature is bound to all of them and to an expiry, so a relayer can carry
 * it but cannot change it.
 */

import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, keccak256, parseAbi, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

// Exit after the sockets have had a moment to close: on Windows, exiting while undici is still closing one
// ends the process with a libuv assertion instead of the exit code.
const finish = async (code) => {
  process.exitCode = code;
  await new Promise((r) => setTimeout(r, 300));
  process.exit(code);
};
const need = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`set ${name}`);
    process.exit(2);
  }
  return v;
};

const [cmd, idArg, ...flags] = process.argv.slice(2);
if (!["status", "anchor"].includes(cmd) || !/^\d+$/.test(idArg || "")) {
  console.error("usage: node scripts/anchor.mjs status|anchor <reportId> [--submit]");
  process.exit(2);
}
const reportId = Number(idArg);
const SUBMIT = flags.includes("--submit");

const GL = process.env.NEXT_PUBLIC_UNISON_CONTRACT || "0x4aEAfA02AA10f465E03eBC1488b4C9eD64D77999";
const REGISTRY = need("REGISTRY_ADDRESS");
const RPC = process.env.BASE_RPC_URL || "https://sepolia.base.org";
const NO_SITE = 255;
const keyOf = (file) => {
  const k = JSON.parse(readFileSync(file, "utf8")).private_key;
  return privateKeyToAccount(k.startsWith("0x") ? k : `0x${k}`);
};

const ABI = parseAbi([
  "function anchored(uint32 reportId) view returns (bool)",
  "function attestor() view returns (address)",
  "function recordOf(uint32 reportId) view returns ((bytes32 digest, bytes32 rubric, uint64 anchoredAt, uint8 contractTotal, uint8 siteTotal))",
  "function anchor((uint32 reportId, bytes32 digest, uint8 contractTotal, uint8 siteTotal, bytes32 rubric, uint256 expiry) a, bytes signature)",
]);

async function genlayerReport() {
  const gl = createClient({ chain: studionet });
  let last;
  for (let i = 0; i < 5; i++) {
    try {
      return JSON.parse(await gl.readContract({ address: GL, functionName: "report", args: [reportId] }));
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw last;
}

const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const [report, already] = await Promise.all([
  genlayerReport(),
  pub.readContract({ address: REGISTRY, abi: ABI, functionName: "anchored", args: [reportId] }),
]);

const contractSubject = report.subjects.find((s) => s.kind === "contract");
const siteSubject = report.subjects.find((s) => s.kind === "site");
console.log(`report ${reportId} (rubric ${report.rubric})`);
console.log(`  genlayer  contract ${contractSubject?.total}/10 ${contractSubject?.band}, site ${siteSubject ? siteSubject.total + "/10 " + siteSubject.band : "none"}`);
console.log(`  digest    ${report.digest}`);
console.log(`  registry  ${already ? "already anchored" : "not anchored"}`);

if (cmd === "status") {
  if (already) {
    const rec = await pub.readContract({ address: REGISTRY, abi: ABI, functionName: "recordOf", args: [reportId] });
    console.log(`  recorded  contract ${rec.contractTotal}, site ${rec.siteTotal === NO_SITE ? "none" : rec.siteTotal}, at ${rec.anchoredAt}`);
  }
  await finish(0);
}

if (already) {
  console.error("refused: this report is already anchored, and a record is never changed");
  await finish(1);
}
if (!contractSubject || !/^[0-9a-f]{64}$/.test(String(report.digest))) {
  console.error("refused: the report has no contract mark or no valid digest");
  await finish(1);
}

const attestor = keyOf(need("ATTESTOR_KEY_FILE"));
const onChain = await pub.readContract({ address: REGISTRY, abi: ABI, functionName: "attestor" });
if (onChain.toLowerCase() !== attestor.address.toLowerCase()) {
  console.error(`refused: this key (${attestor.address}) is not the registry's attestor (${onChain})`);
  await finish(1);
}

const message = {
  reportId,
  digest: `0x${report.digest}`,
  contractTotal: Number(contractSubject.total),
  siteTotal: siteSubject ? Number(siteSubject.total) : NO_SITE,
  rubric: keccak256(toHex(String(report.rubric))),
  expiry: BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60),
};
const signature = await attestor.signTypedData({
  domain: { name: "UnisonRegistry", version: "1", chainId: baseSepolia.id, verifyingContract: REGISTRY },
  types: {
    Anchor: [
      { name: "reportId", type: "uint32" },
      { name: "digest", type: "bytes32" },
      { name: "contractTotal", type: "uint8" },
      { name: "siteTotal", type: "uint8" },
      { name: "rubric", type: "bytes32" },
      { name: "expiry", type: "uint256" },
    ],
  },
  primaryType: "Anchor",
  message,
});
console.log(`signed contract ${message.contractTotal}, site ${message.siteTotal === NO_SITE ? "none" : message.siteTotal}, valid for 24 hours`);

if (!SUBMIT) {
  console.log(`signature ${signature}`);
  console.log("not submitted (pass --submit to send it)");
  await finish(0);
}

const relayer = process.env.RELAYER_KEY_FILE ? keyOf(process.env.RELAYER_KEY_FILE) : attestor;
const wallet = createWalletClient({ account: relayer, chain: baseSepolia, transport: http(RPC) });
const hash = await wallet.writeContract({ address: REGISTRY, abi: ABI, functionName: "anchor", args: [message, signature] });
console.log(`submitted ${hash}`);
const receipt = await pub.waitForTransactionReceipt({ hash });
console.log(`status ${receipt.status} in block ${receipt.blockNumber}`);
await finish(receipt.status === "success" ? 0 : 1);
