import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { authorizeImpersonation } from "@/lib/impersonation-guard";

export const SUPERADMIN_STASH_COOKIE = "sb-super-stash";

/** Validated secondary Auth session, bound to the current impersonated user.
 * A cookie value, a decoded JWT, or getSession().user alone is never enough. */
export async function validatedImpersonation() {
  const superId = process.env.SUPERADMIN_ID;
  if (!superId) return null;
  const jar = await cookies();
  const raw = jar.get(SUPERADMIN_STASH_COOKIE)?.value;
  if (!raw) return null;

  const supabase = await createClient();
  const { data: { user: currentUser }, error: currentError } = await supabase.auth.getUser();
  if (currentError || !currentUser) return null;

  return authorizeImpersonation(raw, currentUser.id, superId, async (accessToken) => {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    return error ? null : user?.id ?? null;
  });
}
