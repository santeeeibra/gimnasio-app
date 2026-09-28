import assert from "node:assert/strict";
import test from "node:test";
import {
  destinationForMemberships,
  partnerAccessDecision,
} from "../../src/lib/partners/identity.ts";
import { compensateFailedPartnerRegistration } from "../../src/lib/partners/registration.ts";

const activePartner = { id: "partner-a", user_id: "user-a", estado: "activo" };

test("Partner identity is bound to Auth user and suspended memberships fail closed", () => {
  assert.equal(partnerAccessDecision(undefined, activePartner), "unauthenticated");
  assert.equal(partnerAccessDecision("user-a", null), "missing");
  assert.equal(partnerAccessDecision("user-b", activePartner), "wrong-user");
  assert.equal(
    partnerAccessDecision("user-a", { ...activePartner, estado: "suspendido" }),
    "suspended",
  );
  assert.equal(partnerAccessDecision("user-a", activePartner), "allow");
});

test("login redirects keep gym and Partner memberships independent", () => {
  const destination = (profile, partner = null, userId = "user-a") =>
    destinationForMemberships({ userId, superadminId: "super", profile, partner });

  assert.equal(destination(null, activePartner), "/partner", "Partner only");
  assert.equal(destination({ rol: "dueno", activo: true }), "/panel", "Owner only");
  assert.equal(destination({ rol: "dueno", activo: true }, activePartner), "/panel", "Owner + Partner");
  assert.equal(destination({ rol: "cliente", activo: true }), "/mi", "Member only");
  assert.equal(destination({ rol: "cliente", activo: true }, activePartner), "/mi", "Member + Partner defaults to gym context");
  assert.equal(destination({ rol: "partner_legacy_disabled", activo: false }, activePartner), "/partner");
  assert.equal(destination(null, { ...activePartner, estado: "suspendido" }), null);
  assert.equal(destination(null, null, "super"), "/admin");
});

test("failed new signup is compensated; existing accounts are never deleted", async () => {
  const deleted = [];
  assert.deepEqual(
    await compensateFailedPartnerRegistration({
      createdNewAuthUser: true,
      userId: "new-user",
      deleteAuthUser: async (id) => { deleted.push(id); return true; },
    }),
    { compensated: true, recoveryRequired: false },
  );
  assert.deepEqual(deleted, ["new-user"]);

  assert.deepEqual(
    await compensateFailedPartnerRegistration({
      createdNewAuthUser: false,
      userId: "existing-owner",
      deleteAuthUser: async () => { throw new Error("must not run"); },
    }),
    { compensated: false, recoveryRequired: false },
  );

  assert.deepEqual(
    await compensateFailedPartnerRegistration({
      createdNewAuthUser: true,
      userId: "orphan",
      deleteAuthUser: async () => false,
    }),
    { compensated: false, recoveryRequired: true },
  );
});
