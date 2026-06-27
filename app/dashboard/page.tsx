import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import DocumentList from "@/components/DocumentList";
import { TEXTS } from "@/lib/config/texts";
import { AnalysisStatus } from "@prisma/client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const documents = await prisma.document.findMany({
    where: {
      userId: session.user.id,
      status: { not: AnalysisStatus.DELETED },
    },
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
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <svg
              className="w-14 h-14 text-[#CBD5E1]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-[#0F172A]">Nessun documento ancora</h2>
            <p className="text-[#64748B] max-w-sm">
              Carica una bolletta per scoprire se stai pagando troppo, o una busta paga per capire ogni voce.
            </p>
            <Link
              href="/analyze"
              className="mt-2 inline-flex items-center justify-center px-6 py-3 bg-[#1B4FD8] text-white rounded-lg font-medium hover:bg-[#1640B0] transition-colors"
            >
              Carica un documento
            </Link>
          </div>
        ) : (
          <DocumentList initialDocuments={documents} />
        )}
      </div>
    </main>
  );
}
