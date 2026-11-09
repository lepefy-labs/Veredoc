import { NextResponse } from "next/server";
import { apiError, apiUser } from "@/lib/pratiche/api";
import { catalog } from "@/lib/pratiche/service";

export async function GET() {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  try { return NextResponse.json({ procedures: await catalog() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
