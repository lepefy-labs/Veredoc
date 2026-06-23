import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email e password obbligatorie." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email già registrata." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, password: hashed } });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}
