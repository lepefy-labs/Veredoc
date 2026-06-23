import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { DOCUMENTO_LABEL } from "@/lib/config/constants";
import { TEXTS } from "@/lib/config/texts";
import { AnalysisStatus } from "@prisma/client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const documents = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">{TEXTS.dashboard.title}</h1>
            <p className="text-sm text-[#64748B] mt-1">{TEXTS.dashboard.subtitle}</p>
          </div>
          <Link href="/analyze">
            <Button size="md">{TEXTS.dashboard.newAnalysis}</Button>
          </Link>
        </div>

        {documents.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-[#64748B] text-sm">{TEXTS.dashboard.empty}</p>
            <Link href="/analyze" className="mt-4 inline-block">
              <Button variant="ghost">{TEXTS.dashboard.newAnalysis}</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const analysis = (doc.analysis ?? null) as Record<string, unknown> | null;
              const importo = analysis?.importo_totale ?? analysis?.stipendio_netto;
              const fornitore = analysis?.fornitore ?? analysis?.datore_lavoro;

              return (
                <Link key={doc.id} href={`/analyze?id=${doc.id}`}>
                  <Card padding="sm" className="hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#0F172A] truncate">
                            {DOCUMENTO_LABEL[doc.type] ?? doc.type}
                          </p>
                          <Badge status={doc.status as AnalysisStatus} />
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5 truncate">{doc.fileName}</p>
                        {fornitore != null && (
                          <p className="text-xs text-[#64748B]">{String(fornitore)}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {importo !== undefined && importo !== null && (
                          <p className="font-mono text-sm font-bold text-[#0F172A]">
                            {Number(importo).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                          </p>
                        )}
                        <p className="text-xs text-[#64748B]">
                          {new Date(doc.createdAt).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
