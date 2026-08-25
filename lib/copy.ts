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

export const PAGE_TITLE = "One Contract, One Agreed Number - Unison";

export const META_DESCRIPTION =
  "Score a GenLayer contract out of ten against a published rubric, judged by the network's own validators.";

/** The hero, two dotted lines. */
export const HERO_LINE_1 = "One Contract";
export const HERO_LINE_2 = "One Agreed Number";
/*
 * No count here, deliberately. It said "Five validators", which is true of
 * this network today and is not read from anywhere, so it would go quietly
 * wrong the day an assay draws a different number or the chain changes under
 * it -- a hardcoded number in the first line of a site whose whole claim is
 * that its numbers are read rather than written. The counters below the hero
 * name the real pool, from the chain.
 */
export const HERO_PILL = "Marked independently, agreed once";
export const LAUNCH = "Launch the dApp";

export const HERO_LEDE =
  "Point at a contract, read the streak. Validators mark it against a published rubric and the report only stands where they agree.";

export const HERO_PLACEHOLDER = "raw file URL of the contract";
/**
 * The four figures under the hero.
 *
 * The design puts a decorative glyph over each -- a hash, an asterisk, a tilde,
 * a percent sign. They are dropped: a percent sign over a validator count reads
 * as a percentage, and a tilde over a figure that is exactly zero says the
 * opposite of what is true. The label carries the meaning instead.
 */
export const COUNTER_REPORTS_ONE = "Report issued";
export const COUNTER_REPORTS = "Reports issued";
export const COUNTER_CRITERIA = "Published criteria";
export const COUNTER_REFUSAL = "Cost of a refusal, in inferences";
export const COUNTER_POOL = "Validators in the pool";

/**
 * The model marquee.
 *
 * The names are READ FROM THE NETWORK, never listed here. The design's row was
 * Claude, GPT, Gemini, Llama, Mistral, DeepSeek, Qwen and "Undisclosed"; the
 * pool this app talks to runs no Llama, runs several models that list never
 * mentions, and discloses all of them.
 *
 * Where the node does not answer there is no strip at all rather than a
 * fallback list, which would be an assertion dressed as a reading.
 */
export const POOL_LABEL = "Models this pool can draw on";
/**
 * What the strip is, said underneath it.
 *
 * The names above are every model the network publishes as reachable: the ones
 * nodes commit to, plus the candidates inside each routing policy. That is not
 * the same as saying any given node runs any given one, and this sentence is
 * where the difference is stated rather than left to be assumed.
 */
export function poolFoot(routed: number, named: number): string {
  if (routed <= 0) return `All ${named} nodes name the model they run.`;
  return `${named} nodes name the model they run, and the other ${routed} route across these per call. Every one of them reads the same bytes and marks independently, and the report stands only where they agree.`;
}

/**
 * Too big, said with both numbers and a way forward.
 *
 * The contract's own refusal names the ceiling and nothing else,
 * which is true and tells nobody how far over they are or what to do. It also
 * used to arrive after a transaction had been signed and settled. This is the
 * same refusal, free, and specific.
 */
export function tooLarge(bytes: number, limit: number): string {
  const over = Math.round(((bytes - limit) / limit) * 100);
  return (
    `That file is ${bytes.toLocaleString("en-US")} bytes and the contract takes ` +
    `${limit.toLocaleString("en-US")}, so it is ${over}% over. Nothing was signed. ` +
    `A rubric is applied to one file, so a project split across several can be ` +
    `submitted a file at a time - but a single file this long is past what this ` +
    `contract will read, and there is no way to divide it.`
  );
}

export const CONNECT_AND_SUBMIT = "Connect a wallet and submit";
export const CONNECTING = "Check your wallet";

export const GATE_FAILED_MEANS =
  "The gate runs first for exactly this reason. A file missing a required marker is caught here, in the browser, before a validator spends a single inference and before anything is charged.";

/**
 * What the report is a report about, said on the report.
 *
 * A url is not an identity. A branch names whatever is on it this morning, so
 * a mark filed against one describes bytes that can be replaced the moment it
 * is published. The digest beside this is the identity and cannot drift; this
 * line says whether the citation can be followed back to it.
 */
export function revisionNote(kind: string, ref: string): string {
  if (kind === "pinned") {
    return `pinned to commit ${ref.slice(0, 12)}, which cannot be repointed`;
  }
  if (kind === "moving") {
    return `${ref || "a branch"} moves, so read the digest below as the identity`;
  }
  return "this host publishes no revision, so the digest below is the identity";
}

export const CONSENSUS_EYEBROW = "Consensus";

/**
 * The heading names the real pool size, read with the same call the counter
 * under the hero uses, so the two can never disagree. The design said "a pool
 * of a thousand" and the counter beside it said 1,001; the network this runs
 * on has twenty. One of the two had to be reading rather than asserting.
 */
export function consensusHeading(poolSize: number | null): string {
  if (poolSize === null) return "Several readings, one agreed number";
  return `Several readings, drawn from a pool of ${poolSize.toLocaleString("en-US")}`;
}

export const CONSENSUS_BODY =
  "Validators read the same raw file, mark it against the same anchors, and the report only stands where they agree under the rule below";

/** What the contract publishes as the meaning of "agreed". */
export const AGREEMENT_EYEBROW = "The agreement rule, as published";
export const AGREEMENT_NOTE =
  "Read straight from the contract, which fixed this rule in the transaction that deployed it. What the chain records is how many validators agreed, which is the number that decides whether a report exists at all.";

export function agreementGap(points: number, divergent: number): string {
  const gap = points === 1 ? "one point" : `${points} points`;
  const spread =
    divergent === 1 ? "on one criterion only" : `on at most ${divergent} criteria`;
  return `Two markers may differ by ${gap}, ${spread}, and the report still stands`;
}

export const AGREEMENT_BAND = "The band both markers land in must be the same";
export const AGREEMENT_REASONS =
  "Wording is never compared, because two careful readers never phrase a reason alike";

export function agreementCounted(counted: number, judged: number): string {
  return `${counted} criteria are counted in deterministic code and ${judged} are put to the jury`;
}

export const MACHINERY_HEADING = "Four parts of the machinery";
export const MACHINERY_TABS = ["Gate", "Anchors", "Consensus", "Record"];

export const CLOSE_HEADING = "Find Out What The Network Makes Of Your Contract";
export const CLOSE_BODY =
  "Free, in the browser, and the gate runs before a validator spends a single inference";

/** Four commitments the contract makes before a single contract is read. */
export const COMMITMENTS: Array<{ title: string; body: string }> = [
  {
    title: "The standard is readable",
    body: "A score against a rubric written after the fact is worth nothing, so ours is published before anyone was scored, with an anchor on every point",
  },
  {
    /* "Validators running different models" was the claim here. Sixteen of the
       twenty nodes in the pool run a routing policy that may pick the same
       model as its neighbour, so the diversity is not something this product
       can promise. What it can promise is that the readings are independent
       and that agreement is required, which is the actual argument. */
    title: "One model is only one opinion",
    body: "Every validator reads the same raw file and marks it on its own, and the mark only stands where they agree under a published rule",
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

export const HOW_EYEBROW = "Story";
export const HOW_HEADING = "A rubric first, then a number";
export const HOW_LEDE = "Four commitments this contract makes before a single line is read";

export const RESULT_SECTION_EYEBROW = "The result";
export const RESULT_SECTION_HEADING_PLAIN = "Two numbers, ";
export const RESULT_SECTION_HEADING_ACCENT = "never averaged";
export const RESULT_SECTION_BODY =
  "A careful contract behind a site that calls a transaction done the moment it is sent is a different problem from a weak contract behind an honest site";
export const RESULT_SECTION_NOTE =
  "The streak on the stone is the same number drawn to length, read against reference marks at 4, 7 and 9";

export const RECORD_EYEBROW = "The record";
export const RECORD_HEADING_PLAIN = "One permalink, ";
export const RECORD_HEADING_ACCENT = "permanent";
export const RECORD_BODY =
  "Worth handing to somebody else - the source, the digest and the rubric version are recorded beside the marks";

export const PLACEHOLDER_SITE = "https://yourproduct.xyz";
export const PLACEHOLDER_PASTE = "# { \"Depends\": \"py-genlayer:...\" }\nfrom genlayer import *";

export const BUTTON = "Run assay";

export const SAMPLES_LEAD = "Or try one:";
export const SAMPLES: Array<{ label: string; file: string }> = [
  { label: "a careful contract", file: "careful.py" },
  { label: "one that settles too loosely", file: "loose.py" },
  { label: "one that isn't an Intelligent Contract", file: "plain.py" },
  /* Written to score well under a scorer that counts characters, and to do
     none of the work. Every marker sits in a comment, a docstring or a string
     constant, so the tree finds nothing and it lands at 1/10. */
  { label: "one written to game the score", file: "decoy.py" },
];

/** {ids} is the comma separated list of missing required checks. */
export function refused(ids: string): string {
  return `Refused before scoring - missing ${ids}. This is not an Intelligent Contract, so no fee is charged and no validator spends inference on it.`;
}

export const EMPTY_SUBMIT = "Give it a raw source URL, or paste the source. Nothing else is needed.";

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

export const CARD_2_TITLE = "What the number is";
export const CARD_2_BODY =
  "A sum of five marks against anchors published before anything was scored, each one derived from the executable structure of the source or judged by validators who read it independently, so the number says where this file sits against a fixed standard rather than against whatever else was reviewed that week.";

/*
 * No fee is mentioned, because there is no fee.
 *
 * Both of these used to end "and the fee was returned", which is a refund of
 * something the contract cannot charge: `assay` is a plain public write, every
 * call goes out with `value: 0n`, and the contract has no way to move value at
 * all. It read as reassurance and it was a mechanism nobody built.
 */
export function nodesDisagreed(criterion: string): string {
  return `The validators did not agree on ${criterion}, so no report was issued. That means the anchor is written badly, which is our problem rather than yours.`;
}

export const NODES_DISAGREED_UNNAMED =
  "The validators did not agree, so no report was issued. That means an anchor is written badly, which is our problem rather than yours.";

export function finalized(id: number): string {
  return `Finalized - report ${id}`;
}

export function contested(c: {
  criterion: string;
  was: number;
  now: number;
  outcome: "upheld" | "superseded";
}): string {
  // Anyone may appeal, so naming the submitter here was wrong twice over: it
  // was not necessarily them, and it made a route open to the author of the
  // code read as though it were closed.
  if (c.outcome === "superseded") {
    return `${c.criterion} was appealed and re-marked by a fresh jury, which read the same bytes against the same anchors and scored it ${c.now} where the original said ${c.was}, so this report supersedes that one.`;
  }
  return `${c.criterion} was appealed, and a fresh jury re-marked it against the same anchors and reached ${c.now} again, so the original mark stands.`;
}

export const RUBRIC_EYEBROW = "Published before anyone was scored";
export const RUBRIC_HEADING = "The rubric";
export const RUBRIC_LEDE =
  "Every score point has an anchor. That is what makes exact agreement between validators reachable, and a score against a standard nobody can read is worth nothing.";

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

/**
 * The counter and the reports disagreeing, which is a reading problem.
 *
 * The contract says how many reports it has issued, and each report is a
 * separate read. On a rate-limited node the count arrives and the reports do
 * not, and the page used to answer that with NO_REPORTS_YET above: a flat
 * statement that nothing has been marked, printed underneath a header that was
 * reading the rubric version off the same chain in the same breath.
 */
export function reportsUnreadable(issued: number): string {
  const many = issued === 1 ? "one report" : `${issued.toLocaleString("en-US")} reports`;
  return `The contract has issued ${many}, and this browser could not read ${issued === 1 ? "it" : "them"} back just now. That is a rate limit on the node rather than an empty record, and refreshing usually settles it.`;
}

export const SAMPLES_UNREACHABLE =
  "The validators fetch a sample themselves, and this origin does not resolve from a node. Deploy the site, or point NEXT_PUBLIC_SAMPLE_BASE at a public origin.";

/* -------------------------------------------------------------------------
   The dApp
   ------------------------------------------------------------------------- */

export const APP_TITLE = "New assay";
/* Leads with the action that produces a mark. The old line led with pasting,
   which is the half that cannot, and set the wrong expectation before anyone
   had touched a control. */
export const APP_LEDE =
  "Give a raw file URL the validators can fetch. The gate runs first, here, and costs nothing.";
export const APP_SOURCE_LABEL = "Source";
export const APP_URL_LABEL = "Raw file URL";
export const APP_SITE_LABEL = "Site, optional and scored separately";

/** A GitHub page url serves markup; the raw one serves the source. */
export const GITHUB_CONVERTED = "A GitHub link, so the raw file is fetched instead:";

export const SOURCE_NOTE =
  "A raw file url, or the GitHub page you are looking at - either works, and a branch is resolved to the commit it points at when you submit, so the report cites something that cannot be repointed later.";

/** The ceiling, stated before a file is chosen rather than after. */
export function sourceCeiling(limit: number): string {
  return `Up to ${limit.toLocaleString("en-US")} bytes.`;
}

export const SITE_EYEBROW = "The site, optional";
export const SITE_NOTE =
  "Scored separately against its own five criteria, and never averaged into the contract's ten. A careful contract behind a careless site is a different problem from the reverse.";
export const APP_PASTE_PLACEHOLDER = [
  "from genlayer import *",
  "",
  "class MyContract(gl.Contract):",
  "    ...",
].join("\n");

export const APP_WALLET_NEEDED =
  "Connect a wallet to submit. The gate above already ran here, free.";

/* -------------------------------------------------------------------------
   The workspace: the connect screen, and the four panes
   ------------------------------------------------------------------------- */

export const CONNECT_TITLE = "Connect Your Wallet";
export const CONNECT_LEDE =
  "Every report is requested by a wallet and recorded against it, so the record says who asked.";
export const CONNECT_PICK = "or pick one";
export const CONNECT_SKIP = "Read a finalized report without connecting";

/**
 * Why connecting is safe, and what it is not.
 *
 * The design writes "connecting signs a message, never a transaction". That is
 * not what happens here: `eth_requestAccounts` signs NOTHING at all, and the
 * only signature this product ever asks for is the review itself. Saying
 * "a message" would understate one and overstate the other.
 */
export const CONNECT_FINE =
  "Connecting shares an address. Nothing is signed until a review is submitted, and every report published is public.";

export const CONNECT_NO_WALLET_TITLE = "No Wallet Here";
export const CONNECT_NO_WALLET =
  "This browser has no wallet extension, so nothing can be signed from it. Reading a report and running the gate both work without one.";

export const CONNECT_SIGNING_TITLE = "Check Your Wallet";
export const CONNECT_SIGNING_LEDE = "Approve the request to open the workspace.";
export const CONNECT_SIGNING_STATUS = "waiting for the wallet";

export const CONNECT_READY_TITLE = "Wallet Connected";
export const CONNECT_CONTINUE = "Continue to the workspace";
export const CONNECT_BACK = "Back to the site";
export const CONNECT_EYEBROW = "Review workspace";

export const WRONG_CHAIN_TITLE = "Wrong Network";

export const PANE_REPORTS_TITLE = "Reports";
export const PANE_REPORTS_LEDE =
  "Every report this contract has issued, newest first.";
export const PANE_REPORTS_NOTE =
  "A suspended review is kept beside a finalized one, because a split is a finding about the rubric and not a failed run.";
export const PANE_SETTINGS_TITLE = "Settings";
export const PANE_SETTINGS_LEDE =
  "The rubric, the network, the wallet and how this workspace looks.";

/**
 * The five lines of the running panel.
 *
 * The design has five stages too, but its third reads "five validators are
 * marking independently" and its fourth "marks are being compared, criterion by
 * criterion". Neither is observable from here: the jury size is the protocol's
 * to choose per transaction, and the comparison happens inside consensus where
 * nothing reports progress. These say what is actually known to be underway.
 *
 * This is a stage line, not a progress bar. It never claims to know how far
 * along a step is, because nothing tells it.
 */
export const RUN_STAGES = [
  "the transaction is being submitted",
  "validators are fetching the source",
  "the gate runs again on the agreed bytes",
  "validators mark against the published anchors",
  "the report is being written on chain",
];

/**
 * The two waits before the run: preparing, then the signature.
 *
 * Both used to be silent. The press did several seconds of network work behind
 * a screen that still looked like a form, and then the wallet appeared on its
 * own with nothing on the page connecting it to what had been pressed.
 */
export const PREPARING_TITLE = "Reading the file";
export const PREPARING_NOTE =
  "Fetching the source, running the gate here, and asking the chain whether these exact bytes already carry a report. None of this costs anything.";

export const SIGNING_TITLE = "Sign in your wallet";
export const SIGNING_NOTE =
  "One transaction, waiting on your signature. The validators fetch the file themselves once it lands, and nothing is charged if you decline.";

export const RUN_EYEBROW = "Review in progress";
export const RUN_NOTE =
  "Every validator fetches the source and marks it. Rotations are normal, so this takes minutes rather than seconds.";

export const APP_HOME_RUNNING_TITLE = "Under review";
export const APP_HOME_RUNNING_LEDE =
  "The source is with the validators. Nothing here needs attention until it settles.";
export const APP_HOME_DONE_LEDE =
  "Finalized on chain, and permanent. The marks below are what the validators agreed on.";
export const APP_HOME_SPLIT_TITLE = "No report issued";
export const APP_HOME_SPLIT_LEDE =
  "The jury did not land on the same marks, so nothing was recorded.";

export const COPY_LINK = "Copy permalink";
export const COPY_LINK_DONE = "Permalink copied";

/** The three cards under the compose box. */
export const HOW_CARDS = [
  {
    kicker: "Step one, free",
    body: "The gate checks four things are present before any validator spends an inference.",
  },
  {
    kicker: "Step two, one transaction",
    body: "Validators fetch the source, agree on the bytes, and mark it against anchors published before anyone was scored.",
  },
  {
    kicker: "Step three, permanent",
    body: "One permalink carries the source, the digest, the rubric it was judged against and every mark.",
  },
];
