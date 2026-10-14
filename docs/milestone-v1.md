# Milestone v1: the review moves in front of the deployment

Reviewed version: `9aefd69ad4dcb76bcfb77bc7e7d263c255dac77b` (2026-08-26, the last commit before 27 August).
Milestone head: `cb6dfa6619ed06970f64b5b95997f4433e8fb262` (2026-09-16).

Comparison, 12 commits, 28 files, +2,816 / -35 lines:
https://github.com/meitipro/unison-labs/compare/9aefd69ad4dcb76bcfb77bc7e7d263c255dac77b...cb6dfa6619ed06970f64b5b95997f4433e8fb262

Every link below is pinned to the milestone head. Documentation commits added
after it do not change the contract or the application.

## The change in one paragraph

Before, Unison marked a contract after it had been deployed. A report said what
the contract scored; what to do about it, and the act of deploying, happened
somewhere else. Now the report carries two more things the contract itself
derives from the agreed bytes (an advisory rules check and the constructor's
parameters), the page turns the published anchors into a list of changes, and
the same page deploys the reviewed bytes from the author's wallet, refusing
unless they hash to the report's digest and reading them back afterwards.

## Report fields

| Field | At the reviewed version | At the head |
| --- | --- | --- |
| `id`, `rubric`, `created_at`, `submitter` | yes | yes |
| `source_url`, `site_url`, `digest` | yes | yes |
| `revision`, `revision_ref`, `source_chars` | yes | yes |
| `gate` (`passed`, `total`, `rows[]`) | yes | yes |
| `subjects[]` (`kind`, `target`, `total`, `band`, `marks[]` with `id`, `score`, `reason`) | yes | yes |
| `rules[]` (`check`, `line`, `name`), advisory, never scored | no | **new** |
| `init_params[]` (`name`, `type`, `optional`, `keyword`) | no | **new** |

The record is built in
[`contracts/unison.py` L2650-L2680](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/contracts/unison.py#L2650-L2680).
Two reads were added next to it: `rules()` publishes the seven checks
([L1700-L1768](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/contracts/unison.py#L1700-L1768),
[L2480-L2490](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/contracts/unison.py#L2480-L2490)),
so a stored finding is only an id and a line and its wording is read from the
chain. The scoring rubric, the criteria, the anchors and the bands are unchanged
at this milestone.

## Where each thing happens

| Question | Code |
| --- | --- |
| How the digest is taken | contract: [`normalise` and `digest_of`](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/contracts/unison.py#L378-L390); browser: [`lib/gate.ts` L160-L171](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/lib/gate.ts#L160-L171). Both are sha256 over the same normalised text |
| The rules check and the constructor capture | [`rule_findings` L2052](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/contracts/unison.py#L2052), [`constructor_of` L2093](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/contracts/unison.py#L2093) |
| What to change, from the published anchors | [`lib/suggest.ts` L35-L64](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/lib/suggest.ts#L35-L64). Computed in the browser from the report and `rubric()`; it writes no text of its own |
| The deploy form | [`components/PreDeploy.tsx` L325-L345](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/components/PreDeploy.tsx#L325-L345) renders one field per `init_params` entry; the coercion is [`lib/deploy.ts` L115-L177](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/lib/deploy.ts#L115-L177) |
| The digest check before anything is signed | [`lib/deploy.ts` L251-L270](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/lib/deploy.ts#L251-L270): the file is fetched again and refused unless it hashes to the report's digest |
| The deploy from the wallet | [`lib/deploy.ts` L285-L333](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/lib/deploy.ts#L285-L333): `deployContract` on a client built for the network the author picked ([L83-L113](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/lib/deploy.ts#L83-L113)); four targets in [`lib/networks.ts`](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/lib/networks.ts#L52-L87) |
| Reading the deployed bytes back | [`readBack` L212-L237](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/lib/deploy.ts#L212-L237) calls `gen_getContractCode`; [L366-L369](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/lib/deploy.ts#L366-L369) hashes them again and reports match, mismatch, or that the node did not answer |
| The same comparison from a shell | [`scripts/match.mjs`](https://github.com/meitipro/unison-labs/blob/cb6dfa6619ed06970f64b5b95997f4433e8fb262/scripts/match.mjs) |

## Checked on 2026-10-14

| | Address | Source at | Canonical bytes | sha256 | Result |
| --- | --- | --- | --- | --- | --- |
| Reviewed version | `0x914a3074d586acC7D7fB56DE605bfb26a0ca3158` | `9aefd69` | 103,020 | `dec7e24d8197ee3e745a1f88a40e3cf5b7787e8e6d64748b9e0a1d7162ddb375` | match |
| Milestone head | `0x4aEAfA02AA10f465E03eBC1488b4C9eD64D77999` | `cb6dfa6` | 120,869 | `1f7eee70bf831e903eba063444d444e3b81c3ef326218c20d0457428d7ff3f33` | match |

Both were read back with `gen_getContractCode` and compared with
`git show <commit>:contracts/unison.py`, in the canonical form `scripts/match.mjs`
uses (LF line endings, trailing newlines trimmed). One thing the comparison
shows plainly: the raw bytes on chain carry CRLF line endings (2,918 carriage
returns in the head deployment, 2,443 in the reviewed one), because they were
deployed from a Windows checkout, while the repository holds LF. The digest and
the comparison are over the normalised text, so they match; a raw byte for byte
comparison does not. The deploy path in this milestone sends the normalised
text, so a deployment made from the page does not have the difference.

Tests at the head: `npm test` passes, with 374 checks in
`contracts/test_helpers.py` and 68 in `tests/parity`; `tsc --noEmit` is clean.
The live site at https://unisonlabs.tech is built from the head.

## Novelty, overlap, materiality

- **Not repeated:** the rubric, the jury, the agreement rule, the gate's
  presence checks and the bands. The reviewed version's scoring is untouched.
- **New:** the advisory rules check and the constructor capture in the contract
  (+477 lines), the deploy path (`lib/deploy.ts`, `components/PreDeploy.tsx`,
  `lib/networks.ts`, about 1,000 lines), the suggestions, the wallet and faucet
  handling for four networks, and 36 new parity tests in five new files (68 in total).
- **Material because:** the report becomes something an author acts on in one
  place, and the deployed contract is verified against the report that was
  reviewed rather than assumed to be.
