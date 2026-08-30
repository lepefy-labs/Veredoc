export interface AnalysisProfileOption {
  id: string;
  label: string;
  kind: string;
  isDefault: boolean;
}

export function resolveProfileId(
  profiles: AnalysisProfileOption[],
  requestedProfileId?: string | null
): string | null {
  if (requestedProfileId && profiles.some((profile) => profile.id === requestedProfileId)) {
    return requestedProfileId;
  }

  return profiles.find((profile) => profile.isDefault)?.id ?? profiles[0]?.id ?? null;
}
