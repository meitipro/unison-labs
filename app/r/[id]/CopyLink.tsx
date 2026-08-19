"use client";

/**
 * The one interactive thing on a report page.
 *
 * A secondary button, never gold: the third use of gold in the product is the
 * streak, and a share action competing with it would cost the streak its
 * authority. Copying is confirmed in the label rather than with a toast, because
 * nothing in this product moves outside the one orchestrated moment.
 */

import { useEffect, useState } from "react";

import * as copy from "../../../lib/copy";

export default function CopyLink({ id }: { id: number }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  async function onCopy() {
    const link = `${window.location.origin}/r/${id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // A denied clipboard is not worth an error panel. The url is in the
      // address bar either way, and saying so is more use than an apology.
      setCopied(false);
    }
  }

  return (
    <button type="button" className="btn btn-quiet" onClick={onCopy}>
      {copied ? "Copied" : copy.ACTION_COPY_LINK}
    </button>
  );
}
