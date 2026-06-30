import { PROVIDER_DISPLAY_NAMES } from '@/lib/config/constants';

export function getProviderDisplay(providerRaw: string) {
  const key = providerRaw.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (PROVIDER_DISPLAY_NAMES[key]) return PROVIDER_DISPLAY_NAMES[key];

  const found = Object.entries(PROVIDER_DISPLAY_NAMES).find(([k]) =>
    key.includes(k) || k.includes(key)
  );
  if (found) return found[1];

  const nome = providerRaw.charAt(0).toUpperCase() + providerRaw.slice(1);
  return {
    nome,
    iniziali: providerRaw.slice(0, 2).toUpperCase(),
    colore: '#888780',
  };
}
