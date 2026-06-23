import { BustaPagaData } from "@/types/bustapaga";

export function calcolaAliquotaEffettiva(busta: BustaPagaData): number {
  if (busta.stipendio_lordo === 0) return 0;
  const totale_trattenute = busta.irpef + busta.contributi_inps;
  return Math.round((totale_trattenute / busta.stipendio_lordo) * 1000) / 10;
}

export function calcolaRateoTfr(busta: BustaPagaData): number {
  return busta.tfr_maturato ?? Math.round((busta.stipendio_lordo / 13.5) * 100) / 100;
}
