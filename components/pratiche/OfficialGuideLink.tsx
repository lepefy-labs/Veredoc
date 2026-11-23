"use client";

import type { ReactNode } from "react";
import { track } from "@vercel/analytics";

export default function OfficialGuideLink({ href, subject, printable, className, children }: {
  href: string;
  subject?: string;
  printable?: boolean;
  className: string;
  children: ReactNode;
}) {
  function recordClick() {
    if (subject) track("guide_official_click", { subject });
  }

  return (
    <a href={href} data-guide-print-url={printable ? href : undefined} className={className}
      onClick={recordClick} onAuxClick={(event) => { if (event.button === 1) recordClick(); }}>
      {children}
    </a>
  );
}
