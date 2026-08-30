"use client";

import { useState } from "react";
import Link from "next/link";
import DocumentList from "@/components/DocumentList";
import HistoricalInsights from "@/components/HistoricalInsights";
import { buildLongitudinalInsights } from "@/lib/insights/history";
import { buildMultiPeriodTrends } from "@/lib/insights/trends";
import { AnalysisStatus, DocumentType, ProfileKind } from "@prisma/client";

interface DashboardDocument {
  id: string;
  profileId: string;
  type: DocumentType;
  fileName: string;
  status: AnalysisStatus;
  createdAt: string;
  analysis: unknown;
}

interface DashboardProfile {
  id: string;
  label: string;
  kind: ProfileKind;
  isDefault: boolean;
  documents: DashboardDocument[];
}

interface ProfileOption {
  id: string;
  label: string;
  kind: ProfileKind;
  isDefault: boolean;
}

export default function ProfileDashboard({ profiles, profileOptions }: { profiles: DashboardProfile[]; profileOptions: ProfileOption[] }) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>("all");
  const visibleProfiles = selectedProfileId === "all"
    ? profiles
    : profiles.filter((profile) => profile.id === selectedProfileId);

  return (
    <div className="space-y-6">
      {profiles.length > 1 && (
        <section className="rounded-xl border border-line bg-white p-4 space-y-3" aria-label="Filtra dashboard per profilo">
          <div>
            <p className="text-sm font-semibold text-ink">Mostra profilo</p>
            <p className="text-xs text-muted mt-1">Filtra documenti e storico senza mescolare persone, case o attività diverse.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedProfileId("all")}
              aria-pressed={selectedProfileId === "all"}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${selectedProfileId === "all" ? "bg-brand text-white border-brand" : "bg-white text-ink border-line hover:border-brand"}`}
            >
              Tutti
            </button>
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => setSelectedProfileId(profile.id)}
                aria-pressed={selectedProfileId === profile.id}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${selectedProfileId === profile.id ? "bg-brand text-white border-brand" : "bg-white text-ink border-line hover:border-brand"}`}
              >
                {profile.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {visibleProfiles.map((profile) => {
        const insights = buildLongitudinalInsights(profile.documents);
        const trends = buildMultiPeriodTrends(profile.documents, profile.id);
        return (
          <section key={profile.id} className="rounded-2xl border border-line bg-white p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-ink">{profile.label}</h2>
                  {profile.isDefault && <span className="text-[11px] rounded-full bg-brand-soft text-brand px-2 py-0.5 font-semibold">predefinito</span>}
                </div>
                <p className="text-xs text-muted mt-1">
                  {profile.documents.length === 1 ? "1 documento" : `${profile.documents.length} documenti`} · storico isolato in questo profilo
                </p>
              </div>
              <Link
                href={`/analyze?profile=${encodeURIComponent(profile.id)}`}
                className="inline-flex items-center justify-center rounded-lg bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-dark"
              >
                Carica per {profile.label}
              </Link>
            </div>

            <HistoricalInsights insights={insights} trends={trends} />
            <DocumentList initialDocuments={profile.documents} profiles={profileOptions} currentProfileId={profile.id} />
          </section>
        );
      })}
    </div>
  );
}
