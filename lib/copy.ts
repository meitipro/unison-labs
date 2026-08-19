/**
 * The copy deck, chapter twelve, set exactly.
 *
 * In one file because these strings were written before the interface around
 * them, and two of them are not negotiable: the refusal, and the second card.
 * Both exist to stop somebody reading more into a result than the product can
 * support.
 *
 * Rules that apply to every string here:
 *   sentence case, active voice, no exclamation marks anywhere in the product
 *   no sentence addresses the reader as `you` except the two card headings
 *   numbers are numerals: nine is written 9
 *   the middle dot is the only separator, with a space either side
 *   the ellipsis is one character and only ever inside a hash or a url
 *
 * ONE DEVIATION, and it is deliberate. The deck's consensus line reads
 * "5 of 5 agreed, exactly, on every criterion". Bare equality on five
 * three-way judgments settled 0 of 3 assays on Studio, so the contract now
 * applies a published tolerance instead, and CONSENSUS below says what the rule
 * actually is. A string that describes a rule the contract does not apply is
 * the one kind of copy this product cannot carry.
 */

export const PAGE_TITLE = "One Contract, One Agreed Number — Unison";

export const META_DESCRIPTION =
  "Score a GenLayer contract out of ten against a published rubric, judged by the network's own validators.";

export const EYEBROW = "Contract review, judged by the network itself";

/** The hero, two dotted lines. */
export const HERO_LINE_1 = "One Contract";
export const HERO_LINE_2 = "One Agreed Number";
export const HERO_PILL = "Five validators, one agreed number";
export const LAUNCH = "Launch the dApp";

export const LEDE =
  "Paste a GenLayer contract. Validators read it against a rubric published before anyone was scored, and mark it out of ten. Point at the site too and it gets its own ten, separately.";

export const HERO_LEDE =
  "Paste a contract, read the streak. Validators mark it against a published rubric and the report only stands where they agree.";

export const HERO_PLACEHOLDER = "raw file URL of the contract";
export const HERO_IDLE = "Site optional, and scored separately";

/** The pool marquee. Which models a validator may be running is undisclosed. */
export const POOL_LABEL = "Models in the validator pool";
export const POOL = [
  "Claude", "GPT", "Gemini", "Llama", "Mistral", "DeepSeek", "Qwen", "Undisclosed",
];
export const POOL_CRITERIA = [
  "agreement rule fits",
  "needs genlayer at all",
  "untrusted input stays untrusted",
  "failure branches exist",
  "boundary drawn where it belongs",
];

export const CONSENSUS_EYEBROW = "Consensus";
export const CONSENSUS_HEADING = "Five readings, drawn from a pool of a thousand";
export const CONSENSUS_BODY =
  "Every validator runs a different and undisclosed model, reads the same raw file, marks it against the same anchors - the report only stands where they agree";

export const MACHINERY_HEADING = "Four parts of the machinery";
export const MACHINERY_TABS = ["Gate", "Anchors", "Consensus", "Record"];

export const CLOSE_HEADING = "Find Out What The Network Makes Of Your Contract";
export const CLOSE_BODY =
  "Free, in the browser, and the gate runs before a validator spends a single inference";

/** The three columns under the hero. */
export const PILLARS: Array<{ index: string; title: string; body: string }> = [
  {
    index: "01 The gate",
    title: "Free, and it runs in your browser",
    body: "Presence checks stop the contract spending a validator's inference on something that isn't an Intelligent Contract",
  },
  {
    index: "02 The marks",
    title: "Summed in the contract, not by a model",
    body: "Each criterion scores 0, 1 or 2 against a published anchor, and the band comes from the total",
  },
  {
    index: "03 The report",
    title: "Permanent once the network finalizes",
    body: "One permalink carrying the source, the digest and the rubric version beside the marks",
  },
];

/** Four commitments the design makes before a single contract is read. */
export const COMMITMENTS: Array<{ title: string; body: string }> = [
  {
    title: "The standard is readable",
    body: "A score against a rubric written after the fact is worth nothing, so ours is published before anyone was scored, with an anchor on every point",
  },
  {
    title: "One model is only one opinion",
    body: "Validators running different models each read the same raw file, and the mark only stands where they agree under a published rule",
  },
  {
    title: "Totals are arithmetic, not judgment",
    body: "Criteria are marked 0, 1 or 2 and the total is summed in the contract, with the band derived by a pure function",
  },
  {
    title: "A split is our problem, not yours",
    body: "When validators disagree no report is issued and the splitting criterion is named, which tells us the anchor is written badly",
  },
];

export const HOW_EYEBROW = "How it works";
export const HOW_HEADING_PLAIN = "A rubric first, ";
export const HOW_HEADING_ACCENT = "then a number";
export const HOW_LEDE = "Four commitments the design makes before a single contract is read";

export const RESULT_SECTION_EYEBROW = "The result";
export const RESULT_SECTION_HEADING_PLAIN = "Two numbers, ";
export const RESULT_SECTION_HEADING_ACCENT = "never averaged";
export const RESULT_SECTION_BODY =
  "A careful contract behind a site that calls a transaction done the moment it is sent is a different problem from a weak contract behind an honest site";
export const RESULT_SECTION_NOTE =
  "The streak on the stone is the same number drawn to length, read against reference marks at 4, 7 and 9";

export const STANDARD_EYEBROW = "The standard";
export const STANDARD_HEADING_PLAIN = "Published ";
export const STANDARD_HEADING_ACCENT = "before anyone was scored";
export const STANDARD_BODY =
  "Every score point has an anchor - that is what makes exact agreement between validators reachable, and a score against a standard nobody can read is worth nothing";
export const STANDARD_NOTE = "Ten criteria in all, five for the contract and five for the site";

export const RECORD_EYEBROW = "The record";
export const RECORD_HEADING_PLAIN = "One permalink, ";
export const RECORD_HEADING_ACCENT = "permanent";
export const RECORD_BODY =
  "Worth handing to somebody else - the source, the digest and the rubric version are recorded beside the marks";

export const CLOSER_PLAIN = "Find out what the network ";
export const CLOSER_ACCENT = "makes of your contract";

export const FIELD_SOURCE = "Contract source";
export const FIELD_SOURCE_QUALIFIER = "raw file URL";
export const FIELD_SITE = "Site";
export const FIELD_SITE_QUALIFIER = "optional, scored separately";

export const PLACEHOLDER_SOURCE = "https://raw.githubusercontent.com/…/contract.py";
export const PLACEHOLDER_SITE = "https://yourproduct.xyz";
export const PLACEHOLDER_PASTE = "# { \"Depends\": \"py-genlayer:…\" }\nfrom genlayer import *";

export const SWAP_TO_PASTE = "paste the source instead";
export const SWAP_TO_URL = "use a URL instead";

export const BUTTON = "Run assay";

export const SAMPLES_LEAD = "Or try one:";
export const SAMPLES: Array<{ label: string; file: string }> = [
  { label: "a careful contract", file: "careful.py" },
  { label: "one that settles too loosely", file: "loose.py" },
  { label: "one that isn't an Intelligent Contract", file: "plain.py" },
];

export const GATE_EYEBROW = "Step one · runs in your browser, free";
export const GATE_HEADING = "The gate";
export const GATE_NOTE =
  "Presence checks only. Passing them proves almost nothing — anyone can type gl.nondet into a comment. Failing a required one proves a great deal, and it stops the contract spending a validator's inference on something that isn't an Intelligent Contract.";

export const ELIGIBLE =
  "Eligible. Passing the gate says only that this is an Intelligent Contract, not that it is a good one. The score below is the part that matters.";

/** {ids} is the comma separated list of missing required checks. */
export function refused(ids: string): string {
  return `Refused before scoring — missing ${ids}. This is not an Intelligent Contract, so no fee is charged and no validator spends inference on it.`;
}

export const EMPTY_SUBMIT = "Give it a raw source URL, or paste the source. Nothing else is needed.";

export const STAGE_FETCHING = "validators are fetching the source";
export const STAGE_SCORING = "scoring against the rubric on every node";

export const RESULT_EYEBROW = "Step two · judged by the adjudication layer";
export const RESULT_HEADING = "The streak";
export const RESULT_NOTE =
  "Each criterion scores 0, 1 or 2 against a published anchor. The total is summed in the contract, never proposed by a model, and the band comes from the total by a pure function.";

/**
 * The consensus strip.
 *
 * Reads the votes out of the receipt, so the count is what actually happened
 * rather than a number written into a design. `idle` validators are not counted
 * against the total: a node that never voted did not disagree.
 */
export function consensus(agreed: number, of: number): string {
  return `${agreed} of ${of} agreed, within a point on one criterion, and on the band`;
}

export const CARD_1_TITLE = "Why two numbers";
export const CARD_1_BODY =
  "They are never averaged. A careful contract behind a site that calls a transaction done the moment it is sent is a different problem from a weak contract behind an honest site, and one number would hide it.";

export const CARD_2_TITLE = "What a 10 does not mean";
export const CARD_2_BODY =
  "This reads source text. It does not execute, fuzz or verify anything. A contract that scores 10 here can still be broken, and this is a first pass before a person reads it, not instead of one.";

export const BANDS = ["unfit", "workable", "strong", "exemplary"] as const;

export function alreadyReviewed(id: number): string {
  return `This exact source was already reviewed, see report ${id}.`;
}

export function nodesDisagreed(criterion: string): string {
  return `The validators did not agree on ${criterion}, so no report was issued and the fee was returned. That means the anchor is written badly, which is our problem rather than yours.`;
}

export const NODES_DISAGREED_UNNAMED =
  "The validators did not agree, so no report was issued and the fee was returned. That means an anchor is written badly, which is our problem rather than yours.";

export const PROVISIONAL =
  "Accepted, provisional — the marks exist, the report is permanent after finality.";

export function finalized(id: number): string {
  return `Finalized · report ${id}`;
}

export function contested(criterion: string): string {
  return `The submitter contested ${criterion}. The score stands and the dispute is recorded.`;
}

export const RUBRIC_EYEBROW = "Published before anyone was scored";
export const RUBRIC_HEADING = "The rubric";
export const RUBRIC_LEDE =
  "Every score point has an anchor. That is what makes exact agreement between validators reachable, and a score against a standard nobody can read is worth nothing.";

export const SPLIT_NOTE_TITLE = "When validators disagree";
export const SPLIT_NOTE_BODY =
  "No report is issued and the splitting criterion is named. That is a signal the anchor is written badly, our problem rather than the submitter's.";

export const ACTION_COPY_LINK = "Copy the report link";
export const ACTION_READ_RUBRIC = "Read the rubric";

export const FOOTER_LINE = "The gate is real, the marks are judged on chain";

/** Shown wherever a number would be, when no contract is configured. */
export const NOT_LIVE =
  "No contract is configured, so there is nothing to read. The rubric, the gate and the marks all live on chain; this page will not invent them.";

/** The chain did not answer. Not the same fact as an empty contract. */
export const CHAIN_UNREACHABLE =
  "The node did not answer, so this panel has nothing to show. It is a reading problem rather than an empty record, and refreshing usually settles it.";

/** Shown where the design puts a sample report and none exists yet. */
export const NO_REPORTS_YET =
  "No contract has been marked yet. This panel shows the newest real report as soon as one exists, and it will not stand in a made-up one meanwhile.";

export const SAMPLES_UNREACHABLE =
  "The validators fetch a sample themselves, and this origin does not resolve from a node. Deploy the site, or point NEXT_PUBLIC_SAMPLE_BASE at a public origin.";

/* -------------------------------------------------------------------------
   The dApp
   ------------------------------------------------------------------------- */

export const APP_TITLE = "New assay";
export const APP_LEDE =
  "Paste an Intelligent Contract, or give a raw file URL. The gate runs first and costs nothing.";
export const APP_SOURCE_LABEL = "Source";
export const APP_URL_LABEL = "Raw file URL";
export const APP_SITE_LABEL = "Site, optional and scored separately";
export const APP_PASTE_PLACEHOLDER = [
  "from genlayer import *",
  "",
  "class MyContract(gl.Contract):",
  "    ...",
].join("\n");

/** What the paste box can and cannot do, said where the box is. */
export const APP_PASTE_NOTE =
  "Pasted text runs the gate here and nothing else. A mark has to be checkable by every validator, and text in this browser is reachable by none of them - give a URL for that.";

export function charCount(n: number): string {
  return n ? `${n.toLocaleString("en-US")} chars` : "nothing pasted yet";
}

export const APP_WALLET_NEEDED =
  "Connect a wallet to submit. The gate above already ran here, free.";
