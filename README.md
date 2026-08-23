<div align="center">

# Unison

**One contract, one agreed number.**

Contract review scored out of ten against a rubric published before anyone was
scored, and judged by the network rather than by us.

[![Built by InferNode](https://img.shields.io/badge/built%20by-InferNode-7ac943?style=flat-square)](https://github.com/meitipro)
[![GenLayer](https://img.shields.io/badge/GenLayer-Intelligent%20Contract-101216?style=flat-square)](https://genlayer.com)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-101216?style=flat-square)](https://nextjs.org)
[![MIT](https://img.shields.io/badge/license-MIT-101216?style=flat-square)](LICENSE)

**[Open the live site](https://unisonlabs.tech)** &nbsp;-&nbsp;
[Run a review](https://unisonlabs.tech/app) &nbsp;-&nbsp;
[Read the rubric](https://unisonlabs.tech/rubric)

</div>

---

## Live

| | |
| --- | --- |
| Site | https://unisonlabs.tech |
| Contract | [`0x87d8ee409beFE0E15D1dBBfbD7d20C04474fDE75`](https://explorer-studio.genlayer.com/address/0x87d8ee409beFE0E15D1dBBfbD7d20C04474fDE75) on GenLayer **studionet** |
| Rubric | v3, frozen by the transaction that deployed the contract |

`npm run match -- 0x87d8ee409beFE0E15D1dBBfbD7d20C04474fDE75` checks the
deployed bytes against `contracts/unison.py` byte for byte.

Line endings are pinned to LF in `.gitattributes` precisely so that check is
not platform dependent: without it a Windows checkout produces CRLF, a Linux
one produces LF, and the same commit yields two different digests.

---

## Overview

Point Unison at a GenLayer contract, and the validators fetch the raw file
themselves, agree on the bytes, and mark it out of ten against a rubric the
contract published before it had ever scored anything, with the product's site
getting its own ten if you give one, kept separate and never averaged into the
first.

The result is drawn as a gold streak on dark stone, its length the score, read
against reference marks at 4, 7 and 9 like an assay card.

Two design decisions carry the product:

**The rubric was frozen by the transaction that deployed the contract.** Every
criterion, every anchor, every gate probe and every band boundary is fixed in
that source. There is no admin method that edits any of them, so a score cannot
be re-explained after the fact by moving the standard it was measured against.

**Whether a mark is counted or judged is published per criterion.** Four of the
five contract criteria are derived in deterministic code from the agreed bytes,
so every validator reaches the same number and the same reason without spending
an inference, and the rest go to the jury, with the rubric page and `rubric()`
both saying which is which.

**A counted mark is read from the syntax tree, not from the characters.** The
source is parsed and the marks come from nodes Python would execute, so a call
named in a comment, a docstring or a string literal contributes nothing, and
`public/fixtures/decoy.py` is kept as the proof: it mentions `strict_eq` twice,
`run_nondet` three times and two raises, all of them inert, and it scores zero
on every counted criterion.

---

## How it works

| | Step | What the contract does |
| --- | --- | --- |
| 1 | You give a raw file URL | Nothing yet. The browser fetches it, runs the gate and hashes it, all free |
| 2 | The gate runs | Six presence checks, four required. A failure stops here and costs nobody an inference |
| 3 | The digest is looked up | If those exact bytes already carry a report you are sent to it rather than charged for a second one |
| 4 | You sign one transaction | The only point at which a wallet is involved |
| 5 | Validators fetch the source | Every one of them fetches it themselves and agrees on the bytes under `strict_eq` |
| 6 | They mark it | Counted criteria in deterministic code, judged criteria by inference, against anchors published in advance |
| 7 | The contract sums and bands | Arithmetic, in the contract. No model is ever asked for a total |

Where the jury does not land on the same answer, **no report is issued at all**,
because averaging a disagreement produces a number nobody voted for, so the
review is suspended and a separate transaction asks which anchor failed to
separate two careful markers, that being a finding about the rubric rather than
a failed run.

---

## Why this needs GenLayer

The contract does not use a model as a backend. It uses one where **a judgement
has to be trusted by somebody who did not make it**.

A score on a contract is worth exactly what the reader thinks of whoever
produced it, so run it through one model behind one API key and you have an
opinion with a logo on it, whereas here the rubric is public before anything is
scored, several validators read the same bytes and mark them independently, and
the report stands only where they agree under a rule the contract also
published.

What that guarantees is precise and worth stating precisely: four of Studio's
twenty nodes name the model they run and the other sixteen route across a
published set per call, every one of them fetches the file itself and marks it
independently, and the report stands only where they agree under the contract's
own rule, so the strength is in the independence and the agreement, both of
them verifiable from the chain.

That boundary is the whole architecture:

- **The contract owns** the rubric, the anchors, the gate probes, the bands, the
  counted-versus-judged split, the agreement rule, the arithmetic and the record.
- **The browser owns** the fetch, the gate, the digest and every screen, so it
  can refuse a submission but never produce a mark.
- **The validators own** the reading, fetching the source themselves, so the
  file they mark is the file the report is about.

---

## The thing that nearly sank it

Asking a model for five 0/1/2 scores and requiring the jury to agree exactly
**never settles**, not rarely, and three markings of one source from a single
node came back `[0,2,0,1,0]`, `[0,2,0,2,0]` and `[0,2,0,0,1]`, the band itself
flipping between runs of the same model on the same bytes, so bare equality
settled **0 of 3** assays and widening the tolerance changed nothing.

The fix was not a bigger tolerance. It was deciding, per criterion, whether the
question was one a count could answer:

| decided by | criteria |
| --- | --- |
| `facts` | `agreement`, `untrusted`, `boundary`, `failure`, `finality`, `mechanism`, `provenance`, `recourse` |
| `judgment` | `necessity`, `overreach` |

The counted contract criteria are read out of the agreed bytes in deterministic
code, so every validator derives them identically by construction, and the same
source settled on the first try afterwards, with the measurements in
[docs/judgment-layer.md](docs/judgment-layer.md).

The site half needed the same treatment later, for the same reason, and it took
two passes. It ran five judged criteria and nothing counted, and a real assay
finalized 3 votes to 2, one vote from being suspended. `finality` and
`provenance` are presence checks wearing a judgement's clothes - does the page
name both accepted and finalized, does it show an address, a network and a link
to the source - so they are decided in code.

Three judged criteria against a tolerance that allows one of them to move is
not a tolerance, and a later assay finalized 3 to 2 again, this time against two
validators who actively disagreed. `recourse` went the same way, and its own
anchors say why it could: nowhere mentioned, mentioned without who or when, or
the window and the cost and who may act all stated. That is a presence check
written out longhand, and the jury had been answering it as one - a live report
reads "no losing path, appeal, dispute, contest, window, deadline or actor is
stated", which is the anchors read back at the price of an inference and a vote
that could go either way.

Two was still too many, and the next assay split the same way. Three markings of
one unchanged page had gone `mechanism` 2, 1, 1 and `overreach` 1, 0, 0, so both
of the remaining judged marks were moving and only one was allowed to. Widening
the rule would have settled the transaction while leaving the same page scoring
3/10 one day and 1/10 the next, which is the thing worth fixing rather than the
symptom. `mechanism` is counted in v3, and its anchors were **rewritten** rather
than merely re-decided: the old ones asked where a sentence sat on the page, and
counting words while claiming to measure position would have been the same
dishonesty in the other direction.

`overreach` stays with the jury. It holds a claim on the page against the
methods the contract actually exposes, which is the one question here that no
count reaches, and it is why this runs on GenLayer at all.

**Every ballot now carries exactly one judged mark**, so two markers can differ
on at most one criterion by construction, and the published rule covers it. Of
the nine score pairs a judged criterion can produce, seven agree; only a marker
answering 0 against one answering 2 still splits, which is what a split should
mean.

---

## The contract

**11 public methods, 8 view and 3 write**, `genvm-lint` clean, pinned to a
concrete runner hash. `npm run match -- 0x...` compares the deployed bytes against
the file on disk, byte for byte.

```
contracts/unison.py     the gate, the rubric, the marks, the reports, the splits
contracts/test_helpers.py   266 checks over its pure half, on plain CPython
```

### Behaviour worth knowing

- **The gate is published, not just implemented.** `gate_spec()` returns the
  probes, so the browser runs the *chain's* gate rather than a copy of it, and
  every probe is a plain case-sensitive substring with **no regular expressions
  on either side**, containment being the one text operation that cannot drift
  between Python and JavaScript.
- **The gate is a filter, not a score, and that is what makes it cheap.** It
  catches a file that is not an Intelligent Contract in the browser, for
  nothing, before a validator spends an inference or a wallet is opened.
- **Normalisation names the characters it trims** - `" \t\n\v\f\r"` - rather
  than calling `str.strip()` or `String.trim()`, which take different sets and
  disagree about the byte order mark, so a file with a BOM would otherwise get
  two different digests and the browser would look up a report filed under a key
  nobody wrote to.
- **Untrusted source text is fenced at the prompt boundary**, angle brackets
  replaced, so a contract cannot address the validator reading it.
- **The two subjects are never added together.** A careful contract behind a
  careless site is a different problem from the reverse, and one number for both
  hides which you have.
- **Bands describe a reading, and the number is the reading.** `unfit`,
  `workable`, `strong` and `exemplary` are names for where a total lands, so
  a score can be compared with another score rather than argued about.

---

## The site

Next.js 14, App Router. Two surfaces: the **site** at `/`, and the **workspace**
at `/app` behind Launch dApp, where a wallet connects and an assay is actually
run.

### Every number on screen is one the product can stand behind

The interface is ported from a design file, and a design file is allowed to
invent where a live page is not, so the mockup filled its panels with 9/10,
report 8812 and digest `4f2a91c0`, listed eight plausible model names in its
validator marquee, and put a pool of 1,001 under the hero.

All of it now reads: the counters show what the contract has issued, what the
rubric publishes, what a refusal costs, and the pool size that
`sim_getAllValidators` reports, the same call the workspace uses so the two can
never disagree, while the strip lists the models actually reachable in the pool
and disappears entirely where the node does not answer, a hardcoded list of
plausible models being an assertion dressed as a reading.

**Three states are kept apart everywhere**: a real mark, an empty contract, and
*the node did not answer*, so a null from a rate-limited read is never rendered
as a zero.

### What a validator's vote actually is

One bit, agreeing with the leader's result or not, and that aggregate is all
the receipt or the contract ever carries, so there is **no per-node mark to
display** anywhere. The design drew five nodes each holding a 9, and where they
were the site now shows the agreement rule the contract publishes, read off the
chain, which is the thing the sentence above it is actually claiming.

### Nothing is announced before the chain has settled

A GenLayer receipt carries three fields that all read like a verdict and two of
them lie: `status` is `FINALIZED` on a refused call because refusing is a
perfectly successful transaction, and `result` is `MAJORITY_AGREE` because
validators agreeing that a call failed is still agreement, so only
`consensus_data.leader_receipt[].execution_result` answers "did my code run".

Every write asserts that field, waits for finality by polling the node directly,
and reads the answer back off the chain rather than off the receipt that arrived
first. A timed-out wait is reported as a wait that timed out, never as a failure.

---

## Running it

```bash
npm install
npm run dev            # http://localhost:4400
```

```bash
npm test               # 31 node tests + 266 pure-half contract checks
npm run lint:contract  # genvm-lint
npm run match -- 0x...   # is the deployed contract the source on disk?
```

The site works with **no contract configured**, and every screen that would show
a mark says so instead of inventing one.

### Deploying your own

```bash
npm run deploy -- --yes
npm run verify -- --contract=0x...
```

`deploy` refuses to send unless the runner header is pinned and the contract's
own suite passes. Copy the printed address **exactly**: Studio matches the
string literally, and the lowercase form of a real contract answers "not found".

---

## What a mark covers

A static reading of the source, against ten published criteria, agreed by
validators who each read it independently. That is the ground a review can
cover before anyone runs the code, and covering it well is what puts a human
reviewer straight to the parts worth their attention.

---

<div align="center">

Built by **InferNode**

</div>
