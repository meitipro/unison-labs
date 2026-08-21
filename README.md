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
| Contract | [`0x39532a73F2A66552bDfE7813bF4273c02F547762`](https://explorer-studio.genlayer.com/address/0x39532a73F2A66552bDfE7813bF4273c02F547762) on GenLayer **studionet** |
| Rubric | v1, frozen by the transaction that deployed the contract |

`npm run match -- 0x39532a73F2A66552bDfE7813bF4273c02F547762` checks the
deployed bytes against `contracts/unison.py` byte for byte.

Line endings are pinned to LF in `.gitattributes` precisely so that check is
not platform dependent: without it a Windows checkout produces CRLF, a Linux
one produces LF, and the same commit yields two different digests.

---

## Overview

Point Unison at a GenLayer contract. Validators fetch the raw file themselves,
agree on the bytes, and mark it out of ten against a rubric the contract
published before it had ever scored anything. Give it the product's site too and
the site gets its own ten, kept separate and never averaged into the first.

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
an inference. The rest go to the jury. The rubric page says which is which, and
so does `rubric()`.

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

Where the jury does not land on the same answer, **no report is issued at all**.
The contract does not average a disagreement into a number that nobody voted
for. It suspends the review and lets a separate transaction ask which anchor
failed to separate two careful markers, because that is a finding about the
rubric rather than a failed run.

---

## Why this needs GenLayer

The contract does not use a model as a backend. It uses one where **a judgement
has to be trusted by somebody who did not make it**.

A score on a contract is worth exactly what the reader thinks of whoever
produced it. Run it through one model behind one API key and you have an
opinion with a logo on it. Here the rubric is public before anything is scored,
several validators read the same bytes and mark them independently, and the
report stands only where they agree under a rule the contract also published.

The pool is not uniformly diverse and the product does not pretend it is: four
of Studio's twenty nodes name the model they run, and the other sixteen name a
routing policy that may land on the same model as its neighbour. What is
guaranteed is that the readings are independent and that agreement is required,
not that the readers differ.

That boundary is the whole architecture:

- **The contract owns** the rubric, the anchors, the gate probes, the bands, the
  counted-versus-judged split, the agreement rule, the arithmetic and the record.
- **The browser owns** the fetch, the gate, the digest and every screen. It can
  refuse a submission but it can never produce a mark.
- **The validators own** the reading. They fetch the source themselves, so the
  file they mark is the file the report is about.

---

## The thing that nearly sank it

Asking a model for five 0/1/2 scores and requiring the jury to agree exactly
**never settles**. Not rarely. Three markings of one source from a single node
came back `[0,2,0,1,0]`, `[0,2,0,2,0]` and `[0,2,0,0,1]` - the band itself
flipped between runs of the same model on the same bytes. Bare equality settled
**0 of 3** assays, and widening the tolerance changed nothing.

The fix was not a bigger tolerance. It was deciding, per criterion, whether the
question was one a count could answer:

| decided by | criteria |
| --- | --- |
| `facts` | `agreement`, `untrusted`, `boundary`, `failure` |
| `judgment` | `necessity`, and all five site criteria |

The counted four are read out of the agreed bytes in deterministic code, so
every validator derives them identically by construction. The same source
settled on the first try afterwards. The measurements are in
[docs/judgment-layer.md](docs/judgment-layer.md).

---

## The contract

**11 public methods, 8 view and 3 write**, `genvm-lint` clean, pinned to a
concrete runner hash. `npm run match -- 0x...` compares the deployed bytes against
the file on disk, byte for byte.

```
contracts/unison.py     the gate, the rubric, the marks, the reports, the splits
contracts/test_helpers.py   166 checks over its pure half, on plain CPython
```

### Behaviour worth knowing

- **The gate is published, not just implemented.** `gate_spec()` returns the
  probes, so the browser runs the *chain's* gate rather than a copy of it. Every
  probe is a plain case-sensitive substring and there are **no regular
  expressions on either side**, because containment is the one text operation
  that cannot drift between Python and JavaScript.
- **Passing the gate proves almost nothing.** Anyone can type the words into a
  comment. Failing a required one proves a great deal, and costs nothing to find
  out.
- **Normalisation names the characters it trims** - `" \t\n\v\f\r"` - rather
  than calling `str.strip()` or `String.trim()`, which take different sets and
  disagree about the byte order mark. A file with a BOM would otherwise get two
  different digests and the browser would look up a report filed under a key
  nobody wrote to.
- **Untrusted source text is fenced at the prompt boundary**, angle brackets
  replaced, so a contract cannot address the validator reading it.
- **The two subjects are never added together.** A careful contract behind a
  careless site is a different problem from the reverse, and one number for both
  hides which you have.
- **There is no pass mark.** Bands describe; they do not approve.

---

## The site

Next.js 14, App Router. Two surfaces: the **site** at `/`, and the **workspace**
at `/app` behind Launch dApp, where a wallet connects and an assay is actually
run.

### Every number on screen is one the product can stand behind

The interface is ported from a design file, and a design file is allowed to
invent. A live page is not. The mockup filled its panels with 9/10,
report 8812 and digest `4f2a91c0`, listed eight plausible model names in its
validator marquee, and put a pool of 1,001 under the hero.

All of it now reads. The counters show what the contract has issued, what the
rubric publishes, what a refusal costs, and the pool size that
`sim_getAllValidators` reports - the same call the Validators screen uses, so
the two can never disagree. The marquee lists the model families actually in the
pool. Where the node does not answer there is no marquee, because a hardcoded
list of plausible models is an assertion dressed as a reading.

**Three states are kept apart everywhere**: a real mark, an empty contract, and
*the node did not answer*. A null from a rate-limited read is never rendered as
a zero.

### What a validator's vote actually is

One bit. It agrees with the leader's result or it does not, and that aggregate
is all the receipt or the contract ever carries. So there is **no per-node mark
to display** - not on the landing, not on a report, not anywhere. The design
drew five nodes each holding a 9; where they were, the site now shows the
agreement rule the contract publishes, read off the chain, which is the thing
the sentence above it is actually claiming.

### Nothing is announced before the chain has settled

A GenLayer receipt carries three fields that all read like a verdict, and two of
them lie. `status` is `FINALIZED` on a refused call, because refusing is a
perfectly successful transaction. `result` is `MAJORITY_AGREE`, because
validators agreeing that a call failed is still agreement. Only
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
npm test               # 21 node tests + 166 pure-half contract checks
npm run lint:contract  # genvm-lint
npm run match -- 0x...   # is the deployed contract the source on disk?
```

The site works with **no contract configured**. Every screen that would show a
mark says so instead. It never invents one.

### Deploying your own

```bash
npm run deploy -- --yes
npm run verify -- --contract=0x...
```

`deploy` refuses to send unless the runner header is pinned and the contract's
own suite passes. Copy the printed address **exactly**: Studio matches the
string literally, and the lowercase form of a real contract answers "not found".

---

## What this is not

It reads source text. It does not execute, fuzz or verify anything. A contract
that scores 10 here can still be broken, and this is a first pass before a
person reads it, not instead of one.

---

<div align="center">

Built by **InferNode**

</div>
