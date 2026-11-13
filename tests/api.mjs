import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .trim()
    .split("\n")
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
assert.ok(
  env.OWNER_KEY.endsWith("-dev"),
  "Only run this fixture against development.",
);
const origin = "http://localhost:3000";
const request = (path, options = {}) => fetch(origin + path, options);
assert.equal((await request("/")).status, 200);
console.log("PASS app responds with HTTP 200");
assert.equal((await request("/api/sessions")).status, 200);
assert.equal((await request("/api/program?version=2")).status, 200);
console.log("PASS journal and program load without device setup");
const headers = {
  Origin: origin,
  "Content-Type": "application/json",
};
assert.equal(
  (
    await request("/api/sessions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...session,
        updatedAt: "2025-01-01T00:00:00.000Z",
      }),
    })
  ).status,
  409,
);
console.log("PASS stale updates cannot overwrite newer data");
assert.equal(
  (
    await request("/api/sessions", {
      method: "POST",
      headers: { ...headers, Origin: "https://example.com" },
      body: JSON.stringify(session),
    })
  ).status,
  403,
);
console.log("PASS cross-origin writes rejected");
