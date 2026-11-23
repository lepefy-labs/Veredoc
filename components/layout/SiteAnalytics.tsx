"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";

function omitGuideSearch(event: BeforeSendEvent) {
  const url = new URL(event.url, window.location.origin);
  if (url.pathname !== "/guide" || !url.searchParams.has("q")) return event;
  url.searchParams.delete("q");
  return { ...event, url: url.href };
}

export default function SiteAnalytics() {
  return <Analytics beforeSend={omitGuideSearch} />;
}
