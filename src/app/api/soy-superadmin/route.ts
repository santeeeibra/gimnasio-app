import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";

export async function GET() {
  const profile = await getSessionProfile();
  const superId = process.env.SUPERADMIN_ID;
  const esSuperadmin = Boolean(profile && superId && profile.id === superId);
  return NextResponse.json({ esSuperadmin });
}
