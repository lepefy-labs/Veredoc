import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const rates = await prisma.marketRate.findMany({
    where: category ? { category } : undefined,
    orderBy: { priceValue: "asc" },
  });

  return NextResponse.json(rates);
}
