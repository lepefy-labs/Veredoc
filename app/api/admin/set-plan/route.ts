import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserPlan } from "@prisma/client";
import { normalizeEmail } from "@/lib/account/credentials";
import { findUserIdByEmail } from "@/lib/account/users";
import { isJobRequestAuthorized } from "@/lib/security/access";

export async function POST(req: NextRequest) {
  if (!isJobRequestAuthorized(req.headers.get("authorization"), process.env.ADMIN_SECRET)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const body = await req.json();
  const { plan } = body as { plan?: string };
  const email = normalizeEmail((body as { email?: unknown }).email);

  if (!email || !plan) {
    return NextResponse.json({ error: "email e plan sono obbligatori." }, { status: 400 });
  }

  if (!Object.values(UserPlan).includes(plan as UserPlan)) {
    return NextResponse.json({ error: `plan deve essere uno tra: ${Object.values(UserPlan).join(", ")}` }, { status: 400 });
  }

  const targetId = await findUserIdByEmail(email);
  if (!targetId) {
    return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });
  }

  const user = await prisma.user.update({
    where: { id: targetId },
    data: { plan: plan as UserPlan },
    select: { id: true, email: true, plan: true },
  });

  return NextResponse.json({ ok: true, user });
}
