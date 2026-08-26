<div align="center">

# Unison

**One contract, one agreed number.**

Contract review scored out of ten against a rubric published before anything was
scored. The mark and the reasons behind it are agreed by validators who each
read the source themselves.

[![Built by InferNode](https://img.shields.io/badge/built%20by-InferNode-7ac943?style=flat-square)](https://github.com/meitipro)
[![GenLayer](https://img.shields.io/badge/GenLayer-Intelligent%20Contract-101216?style=flat-square)](https://genlayer.com)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-101216?style=flat-square)](https://nextjs.org)

</div>

---

## Live

| | |
| --- | --- |
| Site | [unisonlabs.tech](https://unisonlabs.tech) |
| Contract | [`0x914a3074d586acC7D7fB56DE605bfb26a0ca3158`](https://explorer-studio.genlayer.com/address/0x914a3074d586acC7D7fB56DE605bfb26a0ca3158) on GenLayer studionet |
| Rubric | v3, frozen by the transaction that deployed the contract |

`npm run match -- 0x914a3074d586acC7D7fB56DE605bfb26a0ca3158` compares the
deployed bytes against `contracts/unison.py`, byte for byte. Line endings are
pinned to LF in `.gitattributes` so that comparison does not depend on who ran
the deploy.

---

## Overview

Point Unison at a GenLayer contract and give it the product's site if there is
one. Every validator fetches the raw file itself, agrees on the bytes, and marks
them out of ten against a rubric the contract published before it had ever
scored anything. The site gets its own ten, kept apart and never averaged into
the first. The result is drawn as a gold streak on dark stone, its length the
score, read against reference marks at 4, 7 and 9 like an assay card.

Two design decisions carry the product:

**The rubric was frozen by the transaction that deployed the contract.** Every
criterion, every anchor, every gate probe and every band boundary is fixed in
that source, and there is no admin method that edits any of them, so a score
cannot be re-explained afterwards by moving the standard it was measured
against.

**A counted mark is read from the syntax tree, not from the characters.** The
source is parsed, the tree is pruned to the statements the language can reach,
and the marks come from what is left. A call named in a comment, a docstring or
a string literal contributes nothing, and neither does one written after a
`return` or under an `if False:`. The fact sheet the jury is handed alongside
those marks is read from the same tree, so a count and a model are looking at
one file rather than at two readings of it.

---

## How it works

| | Step | What the contract does |
| --- | --- | --- |
| 1 | You give a raw file url | Nothing yet. The browser fetches it, runs the gate and hashes it, all free |
| 2 | The gate runs | Six presence checks, four of them required. A failure stops here and costs nobody an inference |
| 3 | The digest and the site are looked up together | If those bytes behind that site already carry a report you are sent to it rather than charged for a second one |
| 4 | You sign one transaction | The only point at which a wallet is involved |
| 5 | Validators fetch the source | Every one of them fetches it itself and agrees on the bytes under `strict_eq` |
| 6 | They mark it | Counted criteria in deterministic code, judged criteria by inference, both against anchors published in advance |
| 7 | The contract sums and bands | Arithmetic, in the contract. No model is ever asked for a total |

Where the jury does not land on the same answer **no report is issued at all**,
because averaging a disagreement produces a number nobody voted for. The review
is suspended, and a separate transaction asks which anchor failed to separate
two careful markers, that being a finding about the rubric rather than a failed
run.

---

## Why this needs GenLayer

The contract does not use a model as a backend. It uses one where **a judgement
has to be trusted by somebody who did not make it**.

A score on a contract is worth exactly what the reader thinks of whoever
produced it. Run it through one model behind one API key and you have an opinion
with a logo on it. Here the rubric is public before anything is scored, several
validators read the same bytes and mark them independently, and the report
stands only where they agree under a rule the contract also published.

That boundary is the whole architecture:

- **The contract owns** the rubric, the anchors, the gate probes, the bands, the
  counted-versus-judged split, the agreement rule, the arithmetic and the record.
- **The browser owns** the fetch, the gate, the digest and every screen, so it
  can refuse a submission but never produce a mark.
- **The validators own** the reading, fetching the source themselves, so the
  file they mark is the file the report is about.

---

## The contract

**11 public methods, 8 view and 3 write**, `genvm-lint` clean, pinned to a
concrete runner hash rather than an alias. `contracts/test_helpers.py` runs 327
checks over its pure half on plain CPython, and `tests/parity` re-derives the
gate in TypeScript so the browser and the chain cannot drift apart.

### Behaviour worth knowing

- **The gate is published, not just implemented.** `gate_spec()` returns the
  probes, so the browser runs the chain's gate rather than a copy of it, and
  every probe is a plain case-sensitive substring, containment being the one
  text operation that cannot drift between Python and JavaScript.
- **The gate is a filter, not a score, and that is what makes it cheap.** A file
  that is not an Intelligent Contract is caught in the browser, for nothing,
  before a validator spends an inference or a wallet is opened.
- **Whether a mark is counted or judged is published per criterion.** Eight are
  derived in deterministic code, so every validator reaches the same number and
  the same reason without spending an inference, and two go to the jury, with
  the rubric page and `rubric()` both saying which is which.
- **A keyword is a word.** The site half reads a rendered page rather than
  source, so a mark turns on whether a word is present, and a word is matched at
  its boundaries. "Losing" inside "closing" is not a losing path, and "accepted"
  beside "finalise your order" is a checkout rather than a transaction.
- **A report cites a commit, not a branch.** The reference is resolved to the
  revision it points at before anything is fetched, and the sha256 of the bytes
  sits beside it, so the citation and the identity are both on the record.
- **An appeal re-marks, and anyone may open one.** The validators fetch the same
  bytes again and refuse outright if they no longer hash to the digest on the
  record, then a fresh jury marks the disputed criterion against the same
  anchors. A different answer supersedes the report and keeps the previous score
  on it. The route is open to whoever wrote the code rather than to whoever
  paid, since those are rarely the same account.
- **An appeal that could not change anything is refused before it is spent.** A
  criterion counted from bytes the appeal has just re-fetched arrives at the
  same number by construction, so opening one there leaves the report's appeal
  untouched and a stranger cannot spend somebody else's.
- **The two subjects are never added together.** A careful contract behind a
  careless site is a different problem from the reverse, and one number for both
  hides which you have.

The reasoning behind the counted-versus-judged split, and the measurements that
forced it, are in [docs/judgment-layer.md](docs/judgment-layer.md).

---

## The site

Next.js 14, App Router. Two surfaces: the site at `/`, and the workspace at
`/app` behind Launch dApp, where a wallet connects and an assay is actually run.
Every counter, every model name and every band on screen is read from the chain,
and three states are kept apart everywhere: a real mark, an empty contract, and
the node not answering, so a null from a rate-limited read is never rendered as
a zero.

### Nothing is announced before the chain has settled

A GenLayer receipt carries three fields that all read like a verdict, and two of
them lie. `status` is `FINALIZED` on a refused call, because refusing is a
perfectly successful transaction. `result` is `MAJORITY_AGREE`, because
validators agreeing that a call failed is still agreement. Only
`consensus_data.leader_receipt[].execution_result` answers "did my code run".

So every write asserts that field, waits for finality by polling the node, and
**reads the answer back off the chain** rather than off the receipt that arrived
first. A wait that timed out is reported as a wait that timed out, never as a
failure.

---

## What stands between a url and a number

Eight mechanisms, all of them in the contract, all of them running on every
assay.

1. **A rubric that cannot move.** Criteria, anchors, gate probes and band
   boundaries are fixed in the deployed source, with no method that edits them.
2. **A gate before the inference.** Six presence checks catch a file that is not
   an Intelligent Contract in the browser, before a validator is asked for
   anything.
3. **Marks read from executable structure.** The tree is parsed and pruned to
   what the language can reach, so a marker in a comment, in a docstring, or in
   code placed after a `return`, counts for nothing.
4. **The same file for every marker.** Validators fetch the source themselves
   and agree on the bytes under `strict_eq` before a single mark is made.
5. **Identical counted marks by construction.** Eight of the ten come from
   deterministic code over those agreed bytes, so they can never be the thing
   that splits a round.
6. **A published agreement rule.** `agreement_holds` is in the source and on the
   rubric page, and where the jury does not meet it no report is written at all.
7. **A report bound to bytes.** The resolved commit and the sha256 both sit on
   the record, and an appeal refuses outright if the source has moved.
8. **An appeal that can change the number.** A fresh jury re-marks against the
   same anchors, open to whoever wrote the code, and one that could not have
   changed anything is refused rather than spent.

Three fixtures hold the third of those in place, and all of them pass every gate
check, so none is distinguishable from a careful contract from the outside:
`public/fixtures/careful.py` does the work and scores eight of the eight counted
points, `decoy.py` puts every marker in a comment or a docstring and scores
nothing, and `deadcode.py` writes them as real code the interpreter never
reaches and scores nothing either.

---

<div align="center">

Built by **InferNode**

</div>
