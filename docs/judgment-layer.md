# The judgment layer, and what measuring it changed

Everything here was measured on Studio against a deployed contract. It is kept
out of `contracts/unison.py` because on-chain bytes are a real cost and a
build diary is not part of the published standard - the contract keeps the
rules, this file keeps the reasoning.

## The three consensus rounds

| # | Round | What every validator does | What agreement is |
|---|---|---|---|
| 1 | `fetch_source` | GETs the url, normalises the bytes | `strict_eq` - byte identical |
| 2 | `mark_contract` | Marks the source against five anchors | the published tolerance |
| 3 | `mark_site` | Renders the page and marks it | the published tolerance |

Round 1 is cheap and it earns its place twice: it fixes the digest a report is
keyed by, and it means round 2 compares judgments of **character-identical
prompts** rather than judgments of whatever each node happened to receive.

Round 3 never wraps the page in an agreement of its own. Two nodes rendering the
same marketing page a second apart get different html; demanding they agree on
it would refuse every honest submission. The agreement is on the marks.

## Bare equality does not settle. Measured.

The first version required every validator to land on the identical five
integers. Three assays of the same source, same contract, no code changes
between them:

| attempt | transaction | consensus | leader | rounds | time |
|---|---|---|---|---|---|
| 1 | UNDETERMINED | MAJORITY_DISAGREE | SUCCESS | 2 | 351s |
| 2 | UNDETERMINED | MAJORITY_DISAGREE | SUCCESS | 2 | 332s |
| 3 | UNDETERMINED | MAJORITY_DISAGREE | SUCCESS | 2 | 272s |

**0 of 3 settled.** The leader executed cleanly every single time, which is the
part worth dwelling on: nothing was broken. One receipt put numbers on the
split:

```json
{"0x2eD9...":"agree","0x5a14...":"disagree","0xA628...":"disagree",
 "0xF9ce...":"disagree","0xf17d...":"idle"}
```

Five validators, one agree, three disagree, one idle.

The cause is not model diversity and it is not prompt injection. Five
independent three-way judgments have to match five times over, and asking any
model twice whether an agreement rule is "looser than the output needs" gets two
reasonable and different answers. A rubric that can never issue a report is not
stricter than one that can - it has no output.

### The tolerance alone did not fix it

Widening agreement to "no criterion differs by more than one point, at most one
criterion differs at all, the band is identical" changed nothing: still
`MAJORITY_DISAGREE`, still `UNDETERMINED`.

Two things were ruled out before the rubric was touched, because both would have
looked identical from outside:

- **The fetch round.** A probe that did nothing but `strict_eq` over the same url
  settled `MAJORITY_AGREE` with every validator reaching the same digest. GitHub
  rate limiting the validator fleet was a good theory and a wrong one.
- **The shape check.** A probe whose validator agreed only if the leader's ballot
  survived calldata as `ballot_is_sound` expects settled too, reporting
  `types: ["int","int","int","int","int"]`. `calldata.decode` returns plain
  `int` and `list`, so the type check was never the denial.

### Then the actual measurement

A probe generated from the contract's own pure half - same anchors, same fact
sheet, same prompt builder - marked one source three times on **one node**:

```
[0, 2, 0, 1, 0]   total 3   unfit
[0, 2, 0, 2, 0]   total 4   workable
[0, 2, 0, 0, 1]   total 3   unfit
```

| criterion | across three runs | |
|---|---|---|
| `agreement` | 0, 0, 0 | stable |
| `necessity` | 2, 2, 2 | stable |
| `untrusted` | 0, 0, 0 | stable |
| `boundary` | 1, 2, 0 | **the whole range** |
| `failure` | 0, 0, 1 | varies |

One model, one character-identical prompt, and the **band itself flipped**. No
tolerance defined across nodes can rescue that, because the variance is not
between validators - it is inside a single one.

The two stable criteria are exactly the two the fact sheet spoke to directly.
That is the finding: the fact sheet works, and it was not being used for the
criteria that needed it most.

## Three changes came out of that

### 1. Facts are computed in code, not judged by a model

`contract_evidence()` hands the model a `<facts>` block it may not contradict.
It carries what the one judged contract criterion actually needs: calls to a
model, calls to the web, whether the source renders a page rather than calling an
api, non-deterministic blocks in total, public write methods, public view
methods, whether it reads another contract's state, and length in characters.

That list is deliberately narrower than it once was. It used to carry the
discriminators for every criterion - equivalence principles, angle-bracket
replacements, raise counts, error prefixes - and those all moved into
`facts_mark`, which reads them off the syntax tree and scores them without
asking anyone. What is left here is what `necessity` needs, which is a question
about intent that no count answers.

Every fact is a count or a containment over bytes the network has **already
agreed on**, so every validator reads a character-identical fact sheet. What is
left for the model is the part it is good at: mapping fixed facts onto a
published anchor.

No fact is worth anything alone. A model call appears in careful contracts and
careless ones alike. The rubric is what reads them.

`contracts/test_helpers.py` asserts the sheet **separates the fixtures** - a
fact sheet that reads the same for a careful contract and a careless one has
told the model nothing and the round is back to being a coin toss.

### 2. What a count can settle is settled by the count

This is the change that made it work, and it is the spec's own argument taken
seriously: *"Every score point has an anchor. That is what makes exact agreement
between validators reachable."* An anchor a count can settle should be settled by
the count. Asking a model to re-derive "are the calls grouped" from source it was
handed samples the model, not the contract.

`rubric()` publishes `decided_by` on every criterion:

| decided by | criteria |
|---|---|
| `facts` | `agreement`, `untrusted`, `boundary`, `failure`, `finality`, `mechanism`, `provenance`, `recourse` |
| `judgment` | `necessity`, `overreach` |

The four counted **contract** criteria come from `facts_mark` over the parsed
syntax tree, a pure function of the agreed bytes. Every validator derives the
identical score **and the identical reason**, without spending an inference, so
they can never be the thing that splits a round. The reason still names the
construct it scored on - that is what the rubric asks of a reason, and a count
cannot drift into advice.

The four counted **site** criteria are different in a way worth stating plainly,
because it is the thing that took longest to see. They are read from each node's
own render of the page, and the page is deliberately never put under an
equivalence principle, so two honest nodes hold two slightly different texts. The
marks are a pure function of whatever text a node held, and the texts are not the
same. That is why the site round votes on the judged mark alone: comparing the
counted ones would be asking two nodes to agree about something the contract
never asked them to agree on, and it spent the whole tolerance doing it.

What stays with the jury is what a count cannot reach:

- **`necessity`** - does this genuinely need many nodes agreeing, or would one
  deterministic call do? A question about intent, not text.
- **`overreach`** - holding a claim on the page against the methods the contract
  actually exposes is irreducibly semantic, and it is the one question here that
  no count reaches. This is the part of the product GenLayer is *required* for.

### 3. The tolerance is published

```
no criterion may differ by more than one point
at most one criterion may differ at all
the band must be identical
```

The band clause is the one that matters. A single point can cross a band edge -
6 is `workable` and 7 is `strong` - so requiring the same band means every
agreeing validator agrees on **the word beside the numeral**, not merely on
numbers that happen to be close. It caught a wrong test case while being
written, which is the sort of thing a clause earns its place by.

`rubric()` publishes it, for the same reason it publishes the anchors: a
tolerance nobody can read is worth no more than a standard nobody can read, and
this one decides whether a report exists at all.

The sum is still taken in deterministic code from the leader's five integers,
and the band is a pure function of the sum. **No model is ever asked for a
total.**

### It settles

Same source, same script, after the three changes:

| attempt | transaction | consensus | leader | time | |
|---|---|---|---|---|---|
| 1 | FINALIZED | MAJORITY_AGREE | SUCCESS | 48s | **report 8801 issued** |
| 2 | FINALIZED | MAJORITY_AGREE | ERROR | 41s | correctly refused as a repeat |

From 0 of 3 to first try, and the second attempt proves the digest guard: *"this
exact source was already reviewed, see report 8801"*, with no inference spent.

Report 8801, read back off the chain:

```
CONTRACT  3/10  unfit
  0  agreement  strict equality is applied with a model call present and no validator pair
  2  necessity  the contract uses gl.nondet.web.render and gl.nondet.exec_prompt
                to reach consensus on scraped web data
  0  untrusted  external text reaches the prompt with its structure intact
  1  boundary   the calls are grouped, but no stored state is copied to memory first
  0  failure    nothing raises, so every path assumes the happy one
```

A defensible mark: that boilerplate really does apply `strict_eq` over prompt
output, which is the anchor-0 case for `agreement` written before it was read.

### One deviation from the copy deck, deliberately

Chapter twelve sets the consensus line as *"5 of 5 agreed, exactly, on every
criterion"*. Under the tolerance that is no longer true, so `lib/copy.ts` reads:

> {n} of {n} agreed, within a point on one criterion, and on the band

A string describing a rule the contract does not apply is the one kind of copy
this product cannot carry. The count itself comes from `consensus_data.votes` on
the receipt - a contract receives one aggregated bit per validator and can never
count its own jury, so a strip built from anything else would be decoration.

## Why the split table needs a second transaction

A validator's vote is **one bit**. When a marking round fails, no amount of care
lets the contract learn *which* criterion split: the transaction ends
Undetermined and nothing is written. Correct, and useless for improving the
rubric.

So `record_split` asks a different question, one the network *can* settle - not
"what is the score" but "which anchor fails to separate two careful markers
here". That is a property of the anchor and the source together, and validators
agree on it far more readily than on the score it produces, which is exactly why
the answer is worth publishing.

Three guards, because a counter on a public page is worth gaming: the source
must pass the gate, it must hold no report (a source that settled did not
split), and it may be counted once. If the network answers that everything
separates cleanly, nothing is recorded and the call says so.

## Studio facts that changed the code

- **`gen_call` mis-encodes a view whose calldata runs past ~200 bytes**, and
  answers `RLP string ends with N superfluous bytes` where N tracks the argument
  length. 128 bytes is fine, 256 is not - where an RLP length prefix stops
  fitting in one byte. So `gate(source)` works only for short input, chain-side
  gate parity is proven on small cases in `scripts/verify.mjs`, and parity on the
  real 5KB fixtures is proven against the same Python in `tests/parity`.
- **Large request bodies get reset.** `eth_estimateGas` with a 60KB payload
  ECONNRESETs after 23 seconds; a small one answers in 617ms. A ~300 byte
  contract deploys instantly while a 62KB one could not get through 20 retries.
  This is why the contract is trimmed and this file exists.
- **`hashlib.sha256` is present** in GenVM's CPython, verified on a node against
  the known empty-string digest before the digest scheme was committed to.
  `re` and `json` are there too.
- **A timed-out wait is not a failed transaction.** genlayer-js's
  `waitForTransactionReceipt` gives up long before a jury that rotates has
  finished and throws `Timed out waiting ... to reach status "ACCEPTED"`. The first
  assay this project ever ran "timed out" that way and finalized twelve minutes
  later. Every wait here polls the node directly instead.
- **Transactions are queued per account.** A rotating assay blocks the next
  submission from the same address, which is why an unrelated refusal looked like
  it had failed when it had simply not started.

## What the gate is, and what it is not

Six presence checks, four required, every probe a plain case-sensitive
substring. No regular expressions on either side - substring containment is the
one text operation that cannot drift between Python and JavaScript, and the
browser runs this gate for free before any transaction exists.

`gate_spec()` publishes the probes themselves, so a browser running a softer
gate is detectable rather than convenient: `assay` re-runs the real gate on the
bytes the validators agreed on regardless.

Passing it proves almost nothing. Failing a required one proves a great deal, and
it stops a validator spending inference on something that is not an Intelligent
Contract.

## Prompt injection

The marked source is written by whoever wants a high mark, and `rubric()` and
`gate_spec()` hand them the exact tag names used in the prompt. So `<` and `>`
become `(` and `)` at the prompt boundary - replacement, not deletion, so
fencing cannot push a payload back under a cap just applied to it.

Storage keeps the text verbatim. Only the prompt is fenced: a record's job is to
hold what was actually submitted.

The tests assert **closure**, not tolerance: `</source>` appears exactly once,
`<rubric>` exactly once, the real anchors survive, and the attempt is still
present as text. A count of two would be the attacker's tag arriving in the
prompt.

## The paste path is the gate only

A mark has to be independently checkable or it is this page's opinion with a
transaction attached. Validators must be able to reach the same source material,
and text pasted into a browser is reachable by nobody - so pasting runs the gate
for free and says what is missing, and a URL is what gets marked. The `gen_call`
argument limit rules out passing source text to the chain anyway.
