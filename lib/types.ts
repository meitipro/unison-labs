/**
 * The shapes the contract actually returns.
 *
 * Every view on the contract returns a json string rather than a struct,
 * because a report is a nest of two subjects holding five marks each and the
 * alternative is three storage dataclasses whose field order would be load
 * bearing forever. These types describe what comes out of `JSON.parse`.
 *
 * Nothing here is a source of truth. If a field disagrees with
 * contracts/touchstone.py, the contract is right.
 */

export type Anchor = string;

export type Criterion = {
  id: string;
  name: string;
  /** Exactly three: what a 0, a 1 and a 2 look like. */
  anchors: [Anchor, Anchor, Anchor];
  /**
   * "facts" -> settled by a count over the agreed source, identically on every
   * validator. "judgment" -> decided by a model, under the published tolerance.
   */
  decided_by?: "facts" | "judgment";
};

export type Subject = {
  kind: "contract" | "site";
  criteria: Criterion[];
};

/**
 * The tolerance two independent markings must fall inside to count as the same
 * answer. Published for the same reason the anchors are: it decides whether a
 * report exists at all. See docs/judgment-layer.md.
 */
export type AgreementRule = {
  max_point_gap: number;
  max_divergent_criteria: number;
  band_must_match: boolean;
  summed_by: string;
  reasons_compared: boolean;
  counted_criteria: string[];
  judged_criteria: string[];
};

export type Rubric = {
  version: string;
  max_score: number;
  max_total: number;
  bands: Array<{ floor: number; name: string }>;
  agreement?: AgreementRule;
  subjects: Subject[];
  limits: {
    reason_chars: number;
    source_bytes: number;
    prompt_source_chars: number;
    prompt_site_chars: number;
  };
};

export type Mark = {
  id: string;
  score: number;
  reason: string;
};

export type ReportSubject = {
  kind: "contract" | "site";
  target: string;
  total: number;
  band: string;
  marks: Mark[];
};

export type Report = {
  id: number;
  rubric: string;
  created_at: string;
  submitter: string;
  source_url: string;
  site_url: string;
  digest: string;
  source_chars: number;
  gate: {
    passed: number;
    total: number;
    rows: Array<{ id: string; required: boolean; passed: boolean }>;
  };
  /** One or two. There is never an empty slot, a dash or a zero for a missing site. */
  subjects: ReportSubject[];
  contest?: { criterion: string; at: string; by: string };
};

export type SplitRow = {
  id: string;
  kind: "contract" | "site";
  name: string;
  /** A counted criterion is never put to the jury, so it cannot split. */
  decided_by?: "facts" | "judgment";
  splits: number;
  reads_as: "ambiguous" | "workable" | "clear" | "counted";
};

export type Stats = {
  reports: number;
  contested: number;
  splits: number;
  first_report_id: number;
  rubric: string;
};

