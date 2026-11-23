"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

export default function GuideSearchMeasurement({ hasResults }: { hasResults: boolean }) {
  useEffect(() => {
    const timer = window.setTimeout(() => track("guide_search", { hasResults }), 0);
    return () => window.clearTimeout(timer);
  }, [hasResults]);

  return null;
}
