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

        <DocumentList initialDocuments={documents} />
      </div>
    </main>
  );
}
