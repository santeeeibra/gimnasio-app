import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { partnerAccessDecision } from "@/lib/partners/identity";
import type { Partner } from "@/types/partner";

export const getSessionPartner = cache(async (): Promise<Partner | null> => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data } = await supabase
    .from("partners")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as Partner | null) ?? null;
});

export async function requirePartner(): Promise<Partner> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data } = await supabase
    .from("partners")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const partner = (data as Partner | null) ?? null;
  const decision = partnerAccessDecision(user.id, partner);
  if (decision === "missing") redirect("/registro-partner");
  if (decision !== "allow") notFound();
  return partner!;
}
