import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeImpersonation,
  isRestoredSuperadmin,
  mayRestoreImpersonation,
  restoreSuperadminWithAuth,
} from "../../src/lib/impersonation-guard.ts";

const superId = "superadmin-id";
const targetId = "owner-id";
const stash = JSON.stringify({
  accessToken: "real-superadmin-access-token",
  refreshToken: "real-superadmin-refresh-token",
  impersonatedUserId: targetId,
});

test("normal user, owner and partner with invented stash never gain admin rights", async () => {
  for (const userId of ["normal-id", "owner-id", "partner-id"]) {
    let validationCalled = false;
    const result = await authorizeImpersonation(
      "invented-cookie", userId, superId,
      async () => { validationCalled = true; return superId; },
    );
    assert.equal(result, null);
    assert.equal(validationCalled, false);
  }
});

test("valid Auth session of the original superadmin is bound to the target user", async () => {
  assert.deepEqual(
    await authorizeImpersonation(stash, targetId, superId, async (token) => {
      assert.equal(token, "real-superadmin-access-token");
      return superId;
    }),
    JSON.parse(stash),
  );
  assert.equal(await authorizeImpersonation(stash, "another-user", superId, async () => superId), null);
});

test("expired, altered or wrong-account access tokens fail closed", async () => {
  for (const authResult of [null, "partner-id", "owner-id"]) {
    assert.equal(await authorizeImpersonation(stash, targetId, superId, async () => authResult), null);
  }
  assert.equal(await authorizeImpersonation(stash, targetId, superId, async () => {
    throw Error("Auth unavailable");
  }), null);
  assert.equal(await authorizeImpersonation(stash, targetId, undefined, async () => superId), null);
  assert.equal(await authorizeImpersonation(JSON.stringify({ ...JSON.parse(stash), accessToken: "" }), targetId, superId, async () => superId), null);
});

test("restore is restricted to the impersonated session and a well-formed token", () => {
  assert.deepEqual(mayRestoreImpersonation(stash, targetId), JSON.parse(stash));
  assert.equal(mayRestoreImpersonation(stash, "another-user"), null);
  assert.equal(mayRestoreImpersonation("not-json", targetId), null);
  assert.equal(mayRestoreImpersonation(JSON.stringify({ refreshToken: "a" }), targetId), null);
});

test("restoration grants support access only after Auth returns the configured superadmin", () => {
  assert.equal(isRestoredSuperadmin(true, superId, superId), true);
  assert.equal(isRestoredSuperadmin(false, superId, superId), false);
  assert.equal(isRestoredSuperadmin(true, targetId, superId), false);
  assert.equal(isRestoredSuperadmin(true, undefined, superId), false);
});

test("legitimate exit refreshes the original session and verifies the restored identity", async () => {
  const steps = [];
  assert.equal(await restoreSuperadminWithAuth(stash, targetId, superId,
    async (token) => { steps.push("refresh"); assert.equal(token, "real-superadmin-refresh-token"); return true; },
    async () => { steps.push("getUser"); return superId; },
  ), true);
  assert.deepEqual(steps, ["refresh", "getUser"]);
});

test("forged, expired, or swapped restore credentials fail safely", async () => {
  let refreshCalls = 0;
  const refresh = async () => { refreshCalls++; return false; };
  assert.equal(await restoreSuperadminWithAuth("invented", targetId, superId, refresh, async () => superId), false);
  assert.equal(await restoreSuperadminWithAuth(stash, "partner-id", superId, refresh, async () => superId), false);
  assert.equal(refreshCalls, 0);
  assert.equal(await restoreSuperadminWithAuth(stash, targetId, superId, refresh, async () => superId), false);
  assert.equal(await restoreSuperadminWithAuth(stash, targetId, superId, async () => true, async () => targetId), false);
  assert.equal(await restoreSuperadminWithAuth(stash, targetId, superId, async () => { throw Error("expired"); }, async () => superId), false);
});
