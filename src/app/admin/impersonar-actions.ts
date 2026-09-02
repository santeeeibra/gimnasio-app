"use server";

import { entrarComo, salirImpersonacion } from "@/lib/impersonation";

export async function entrarComoAction(formData: FormData): Promise<void> {
  await entrarComo(String(formData.get("profile_id") ?? ""));
}

export async function salirImpersonacionAction(): Promise<void> {
  await salirImpersonacion();
}
