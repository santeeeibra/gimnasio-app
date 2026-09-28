/** A stash carries session credentials for restoration, never authority by itself. */
export type SuperadminStash = {
  accessToken: string;
  refreshToken: string;
  impersonatedUserId: string;
};

export function parseSuperadminStash(raw: string | undefined): SuperadminStash | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const stash = value as Record<string, unknown>;
    if (
      typeof stash.accessToken !== "string" || !stash.accessToken ||
      typeof stash.refreshToken !== "string" || !stash.refreshToken ||
      typeof stash.impersonatedUserId !== "string" || !stash.impersonatedUserId
    ) return null;
    return stash as SuperadminStash;
  } catch {
    return null;
  }
}

/** The Auth server must validate the *superadmin* access token on each
 * privileged request. Bind it to the currently authenticated target session
 * so a copied stash cannot grant privileges to an unrelated logged-in user. */
export async function authorizeImpersonation(
  raw: string | undefined,
  currentUserId: string | undefined,
  superadminId: string | undefined,
  validateAccessToken: (token: string) => Promise<string | null>,
): Promise<SuperadminStash | null> {
  const stash = parseSuperadminStash(raw);
  if (!stash || !currentUserId || !superadminId || currentUserId !== stash.impersonatedUserId) {
    return null;
  }
  try {
    return (await validateAccessToken(stash.accessToken)) === superadminId ? stash : null;
  } catch {
    return null;
  }
}

export function mayRestoreImpersonation(
  raw: string | undefined,
  currentUserId: string | undefined,
): SuperadminStash | null {
  const stash = parseSuperadminStash(raw);
  return stash && currentUserId === stash.impersonatedUserId ? stash : null;
}

export function isRestoredSuperadmin(
  refreshSucceeded: boolean,
  verifiedUserId: string | undefined,
  superadminId: string | undefined,
): boolean {
  return !!refreshSucceeded && !!verifiedUserId && !!superadminId && verifiedUserId === superadminId;
}

/** Refresh tokens are single-use credentials: consume one only on the explicit
 * "back to support" action, then ask Auth who the newly restored user is. */
export async function restoreSuperadminWithAuth(
  raw: string | undefined,
  currentUserId: string | undefined,
  superadminId: string | undefined,
  refresh: (token: string) => Promise<boolean>,
  verifyCurrentUser: () => Promise<string | undefined>,
): Promise<boolean> {
  const stash = mayRestoreImpersonation(raw, currentUserId);
  if (!stash || !superadminId) return false;
  try {
    if (!(await refresh(stash.refreshToken))) return false;
    return isRestoredSuperadmin(true, await verifyCurrentUser(), superadminId);
  } catch {
    return false;
  }
}
