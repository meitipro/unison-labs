# Milestone v2: the agreed number, readable from Base Sepolia

Baseline: `5d2c6e995d0ea1f22bed9ed7d8422e03e2786a8a` (milestone v1 documented, 2026-10-14).

## What it adds

A Unison mark lives on GenLayer, where a contract on another chain cannot read it. This
milestone carries the number across. `contracts/evm/src/UnisonRegistry.sol` records a
finished report on Base Sepolia: which bytes (the report's sha256 digest), the contract
mark out of ten, the site mark if there was one, and the rubric version.

- An attestor (`scripts/anchor.mjs`) reads the report from the Unison contract on GenLayer
  and signs it with EIP-712: `Anchor(reportId, digest, contractTotal, siteTotal, rubric,
  expiry)`. Anyone may submit the signature, so a relayer can carry it and cannot change it.
- A report is recorded once and never changed. There is no function that edits or removes a
  record, not even for the owner or the attestor.
- One call is all another contract needs: `meets(digest, minTotal)` says whether these
  bytes carry a recorded mark of at least that much, and `scoreOf(digest)` returns the mark
  and the report it came from. The first report for a set of bytes stands.
- `bandOf(total)` uses the floors the GenLayer contract publishes (9 exemplary, 7 strong,
  4 workable, below that unfit).

## The trust boundary

The attestor is one key. A reader who needs more than its word recomputes the digest from
the source and reads the report on GenLayer, which the registry points at and cannot prove.
What the attestor cannot do is rewrite history: a report id is recorded once, a signature is
bound to every field it carries (so a relayer cannot raise a mark), a signature expires, a
signature made for another deployment or another chain is refused, and the owner can rotate
the attestor but cannot touch a record.

## Live on Base Sepolia

| | |
| --- | --- |
| Registry | [`0x52CAcB7D5448Be8807A98f4A3FD976ceDc6a4B69`](https://sepolia.basescan.org/address/0x52CAcB7D5448Be8807A98f4A3FD976ceDc6a4B69) |
| Deploy transaction | [`0x544c39bce833073e9a16341f107f2e70c09f84392cca5d24961f2f2d8a133724`](https://sepolia.basescan.org/tx/0x544c39bce833073e9a16341f107f2e70c09f84392cca5d24961f2f2d8a133724), block 56,304,291 |
| Attestor, owner | `0x9Af5091CD8B3170564a5F128C040B2f48b6C8432`, `0x34D0Bbf474cF8D1CB01230F7eB1E0f512DeA32f1` |
| First anchor | report 8801 from the live Unison contract (`0x4aEAfA02AA10f465E03eBC1488b4C9eD64D77999`), rubric v3: contract 7/10 strong, no site. Transaction [`0x4c53b1ffa75a415ab9bad96acb8f40e8c860e2573d549a623016b4d9bc0c46f6`](https://sepolia.basescan.org/tx/0x4c53b1ffa75a415ab9bad96acb8f40e8c860e2573d549a623016b4d9bc0c46f6), block 56,304,364 |

Read back from the chain: `meets(digest, 7)` is true, `meets(digest, 8)` is false,
`firstReportOf(digest)` is 8801, and anchoring 8801 again is refused. The digest is
`fc3d698986ff4d98ff7c263f8d0d0c86f311609f7704ad6b2d154e49ff73aba1`, the one the report
carries on GenLayer. The registry is 3,467 bytes of code; the source's sha256 is
`c47bd2815d0fcd8ad41d5f1e695180e6705312fb7bb0b88c985bc261091afe88`.

## Checked

| | Result |
| --- | --- |
| `forge test` in `contracts/evm` | 15 pass: 14 unit and fuzz (1,000 runs), covering a wrong signer, every field of the attestation altered in turn, an expired signature, a malformed one, the high-s twin of a signature, a signature for another deployment, marks out of range, a second anchor of the same report, rotation of the attestor, and an owner who cannot edit a record |
| Fork of Base Sepolia | 1 pass (`BASE_SEPOLIA_RPC_URL=https://sepolia.base.org forge test --match-contract Fork`) |
| Live | deployed, one real report anchored, read back, a repeat refused |

## Not done

The registry source is not verified on an explorer yet. The site does not
yet show a report's Base record; anchoring is scripted. The attestor reads one report at a
time and does not watch the GenLayer contract for new ones.
