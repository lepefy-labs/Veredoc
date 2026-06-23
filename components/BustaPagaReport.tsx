import Card from "@/components/ui/Card";
import { BustaPagaData } from "@/types/bustapaga";
import { calcolaAliquotaEffettiva } from "@/lib/parsers/bustapaga";

interface BustaPagaReportProps {
  data: BustaPagaData;
}

export default function BustaPagaReport({ data }: BustaPagaReportProps) {
  const aliquota = calcolaAliquotaEffettiva(data);

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Datore di lavoro" value={data.datore_lavoro} />
          <Stat label="Competenza" value={data.competenza} />
          <Stat label="Stipendio lordo" value={data.stipendio_lordo.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} mono />
          <Stat label="Stipendio netto" value={data.stipendio_netto.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} mono highlight />
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Contributi INPS" value={data.contributi_inps.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} mono />
          <Stat label="IRPEF" value={data.irpef.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} mono />
          <Stat label="Aliquota effettiva" value={`${aliquota}%`} mono />
          {data.tfr_maturato !== null && data.tfr_maturato !== undefined && (
            <Stat label="TFR maturato" value={data.tfr_maturato.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} mono />
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-[#0F172A] mb-4">Voci della busta paga</h3>
        <div className="space-y-1 mb-4">
          <div className="flex text-xs text-[#64748B] uppercase tracking-wide px-3 py-1">
            <span className="flex-1">Voce</span>
            <span className="w-28 text-right">Importo</span>
            <span className="w-28 text-right">Tipo</span>
          </div>
          {data.voci.map((voce, i) => (
            <div key={i} className="flex items-start gap-4 px-3 py-3 rounded-lg hover:bg-[#F7F9FC] border-b border-[#E2E8F0] last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium text-[#0F172A]">{voce.nome}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{voce.spiegazione}</p>
              </div>
              <p className={`font-mono text-sm font-semibold w-28 text-right ${voce.tipo === "trattenuta" ? "text-[#EF4444]" : "text-[#10B981]"}`}>
                {voce.tipo === "trattenuta" ? "-" : "+"}{Math.abs(voce.importo).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full w-28 text-center ${voce.tipo === "trattenuta" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                {voce.tipo === "trattenuta" ? "Trattenuta" : "Competenza"}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${mono ? "font-mono" : ""} ${highlight ? "text-[#10B981] text-base" : "text-[#0F172A]"}`}>{value}</p>
    </div>
  );
}
