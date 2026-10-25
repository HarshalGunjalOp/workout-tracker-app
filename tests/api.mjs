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
assert.equal((await request("/api/sessions")).status, 401);
console.log("PASS unpaired journal access rejected");
assert.equal(
  (
    await request("/api/pair", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ key: "invalid" }),
    })
  ).status,
  403,
);
const pair = await request("/api/pair", {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify({ key: env.OWNER_KEY }),
});
assert.equal(pair.status, 200, await pair.clone().text());
const cookie = pair.headers.get("set-cookie").split(";")[0];
console.log("PASS private device pairing");
const headers = {
  Origin: origin,
  Cookie: cookie,
  "Content-Type": "application/json",
};
assert.equal(
  (await request("/api/sessions", { method: "POST", headers, body: "{}" }))
    .status,
  400,
);
console.log("PASS invalid session rejected");
const now = new Date().toISOString();
const session = {
  id: "00000000-0000-4000-8000-000000000001",
  dayId: "upper",
  startedAt: now,
  finishedAt: now,
  updatedAt: now,
  note: "Development API verification fixture",
  movements: [
    {
      exerciseId: "wide-lat",
      name: "Wide-grip lat pulldown",
      note: "",
      sets: [{ weight: "30", reps: "12", done: true }],
    },
  ],
};
const write = await request("/api/sessions", {
  method: "POST",
  headers,
  body: JSON.stringify(session),
});
assert.equal(write.status, 200, await write.text());
const read = await request("/api/sessions", { headers: { Cookie: cookie } });
assert.equal(read.status, 200);
const sessions = await read.json();
assert.deepEqual(
  sessions.find((s) => s.id === session.id),
  session,
);
console.log("PASS session round trip through API → Neon → API");
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
