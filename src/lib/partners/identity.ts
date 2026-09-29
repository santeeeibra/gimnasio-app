export type PartnerRowForAuth = {
  id: string;
  user_id: string | null;
  estado: "activo" | "suspendido";
};

export function partnerAccessDecision(
  authenticatedUserId: string | undefined,
  partner: PartnerRowForAuth | null,
): "allow" | "unauthenticated" | "missing" | "suspended" | "wrong-user" {
  if (!authenticatedUserId) return "unauthenticated";
  if (!partner) return "missing";
  if (partner.user_id !== authenticatedUserId) return "wrong-user";
  if (partner.estado !== "activo") return "suspended";
  return "allow";
}

export type GymMembershipForRedirect = {
  rol: string;
  activo?: boolean;
  debe_cambiar_clave?: boolean;
} | null;

export function authUserIdsToDeleteWithGym(
  profileIds: string[],
  partnerUserIds: Array<string | null>,
): string[] {
  const preserved = new Set(partnerUserIds.filter((id): id is string => id !== null));
  return profileIds.filter((id) => !preserved.has(id));
}

export function destinationForMemberships(input: {
  userId: string;
  superadminId?: string;
  profile: GymMembershipForRedirect;
  partner: PartnerRowForAuth | null;
}): "/admin" | "/bienvenida" | "/panel" | "/mi" | "/partner" | null {
  if (input.superadminId && input.userId === input.superadminId) return "/admin";

  const profile = input.profile;
  if (profile?.activo !== false && profile?.rol !== "partner_legacy_disabled") {
    if (profile?.debe_cambiar_clave) return "/bienvenida";
    if (profile?.rol === "dueno" || profile?.rol === "staff" || profile?.rol === "entrenador") {
      return "/panel";
    }
    if (profile?.rol === "cliente") return "/mi";
  }

  return partnerAccessDecision(input.userId, input.partner) === "allow" ? "/partner" : null;
}
