/**
 * The Unison mark: three gold bars in a white disc.
 *
 * Three bars for three readings landing together, which is what the name means.
 * The design draws it as a white circle with the bars inset to 72% of its
 * width; this is the same construction on a 40-unit grid so it stays crisp at a
 * favicon size and can be handed to an `<img>` without redrawing.
 */

export type MarkProps = {
  /** Rendered diameter in pixels. */
  size?: number;
  /** The disc. White in the design, and never the accent. */
  disc?: string;
  /** The three bars. */
  bars?: string;
  title?: string;
};

export default function Mark({
  size = 40,
  disc = "#ffffff",
  bars = "var(--gold)",
  title,
}: MarkProps) {
  // 72% of 40 = 28.8 wide, centred; three 2.5-tall bars with 2.5 between them.
  const x = 5.6;
  const w = 28.8;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ display: "block", flex: "none" }}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="20" cy="20" r="20" fill={disc} />
      <rect x={x} y="14.75" width={w} height="2.5" rx="1.25" fill={bars} />
      <rect x={x} y="18.75" width={w} height="2.5" rx="1.25" fill={bars} />
      <rect x={x} y="22.75" width={w} height="2.5" rx="1.25" fill={bars} />
    </svg>
  );
}

/** Mark plus wordmark. The wordmark is always lower case and never gold. */
export function Lockup({ size = 34, wordSize = 15 }: { size?: number; wordSize?: number }) {
  return (
    <>
      <Mark size={size} />
      <span style={{ fontSize: wordSize, fontWeight: 500, color: "var(--white)" }}>unison</span>
    </>
  );
}
