import assert from "node:assert/strict";
import test from "node:test";

test("browser Auth stops its refresh timer and visibility listener after SSR initialization", async () => {
  const listeners = new Set();
  const target = new EventTarget();
  const document = { cookie: "", visibilityState: "visible" };
  globalThis.document = document;
  globalThis.window = {
    document,
    location: { href: "https://sysgym.test/login" },
    addEventListener(type, listener) {
      if (type === "visibilitychange") listeners.add(listener);
      target.addEventListener(type, listener);
    },
    removeEventListener(type, listener) {
      listeners.delete(listener);
      target.removeEventListener(type, listener);
    },
  };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sysgym-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-publishable-key";
  const { createClient } = await import("../../src/lib/supabase/client.ts");
  const client = createClient();
  try {
    await client.auth.initialize();
    // Flush the factory's post-initialization callback.
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(client.auth.visibilityChangedCallback, null, "Auth must not revive the previous session on visibility changes");
    assert.equal(client.auth.autoRefreshTicker, null, "middleware owns background renewal");
    assert.equal(createClient(), client, "preserve the shared browser client");
    target.dispatchEvent(new Event("visibilitychange"));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(client.auth.autoRefreshTicker, null);
  } finally {
    await client.auth.stopAutoRefresh();
    client.auth.broadcastChannel?.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});
