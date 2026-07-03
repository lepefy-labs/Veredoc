"use client";

import { useState } from "react";
import Link from "next/link";
import { TEXTS } from "@/lib/config/texts";

type Billing = "monthly" | "annual";

export default function PricingCardPro() {
  const [billing, setBilling] = useState<Billing>("annual");
  const plan = TEXTS.pricing.pro;
  const active = billing === "monthly" ? plan.monthly : plan.annual;

  return (
    <div className="relative bg-white rounded-2xl border-2 border-brand shadow-lg shadow-brand/10 p-6 pt-8 flex flex-col h-full">
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold px-3 py-1 rounded-full bg-brand text-white">
        {plan.popularBadge}
      </span>

      <span className="self-start text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand text-white mb-4">
        {plan.badge}
      </span>

      <div
        role="tablist"
        aria-label="Fatturazione"
        className="inline-flex self-start rounded-lg border border-line p-1 mb-4"
      >
        <button
          type="button"
          role="tab"
          aria-selected={billing === "monthly"}
          onClick={() => setBilling("monthly")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
            billing === "monthly" ? "bg-brand text-white" : "text-muted hover:text-ink"
          }`}
        >
          {plan.monthly.label}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={billing === "annual"}
          onClick={() => setBilling("annual")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
            billing === "annual" ? "bg-brand text-white" : "text-muted hover:text-ink"
          }`}
        >
          {plan.annual.label}
        </button>
      </div>

      <div>
        <span className="text-3xl font-bold text-ink font-mono">{active.price}</span>
        <span className="text-sm text-muted">{active.period}</span>
      </div>
      <p className="text-xs text-success font-medium mt-1 mb-4 h-4">
        {billing === "annual" ? plan.annual.note : " "}
      </p>

      <ul className="space-y-2.5 text-sm text-ink flex-1">
        {plan.features.map((f) => (
          <li key={f.text} className="flex items-start gap-2">
            <span className="text-success font-bold mt-0.5" aria-hidden="true">✓</span>
            <span>
              {f.text}
              {f.soon && <span className="text-faint"> (prossimamente)</span>}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/register"
        className="mt-6 inline-flex items-center justify-center px-5 py-3 bg-brand text-white rounded-lg font-semibold hover:bg-brand-dark transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {plan.cta}
      </Link>
      <p className="text-xs text-muted text-center mt-2">{plan.ctaNote}</p>
    </div>
  );
}
