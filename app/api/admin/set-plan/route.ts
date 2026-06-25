import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserPlan } from "@prisma/client";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const body = await req.json();
  const { email, plan } = body as { email?: string; plan?: string };

  if (!email || !plan) {
    return NextResponse.json({ error: "email e plan sono obbligatori." }, { status: 400 });
  }

  if (!Object.values(UserPlan).includes(plan as UserPlan)) {
    return NextResponse.json({ error: `plan deve essere uno tra: ${Object.values(UserPlan).join(", ")}` }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { email },
    data: { plan: plan as UserPlan },
    select: { id: true, email: true, plan: true },
  });

  return NextResponse.json({ ok: true, user });
}
