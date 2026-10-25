import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const line = readFileSync(".env.production.local", "utf8")
  .split("\n")
  .find((l) => l.startsWith("OWNER_KEY="));
const key = line.slice("OWNER_KEY=".length).trim();
const origin = "https://form-training-mu.vercel.app";
const page = await fetch(origin);
assert.equal(page.status, 200);
assert.ok((await page.text()).includes("FORM"));
console.log("PASS production app responds with HTTP 200");
const unauth = await fetch(origin + "/api/sessions");
assert.equal(unauth.status, 401);
assert.ok((await unauth.json()).error.includes("personal"));
console.log("PASS production journal requires private device access");
const pair = await fetch(origin + "/api/pair", {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify({ key }),
});
assert.equal(pair.status, 200, await pair.clone().text());
const cookie = pair.headers.get("set-cookie").split(";")[0];
console.log("PASS production private device pairing");
const data = await fetch(origin + "/api/sessions", {
  headers: { Cookie: cookie },
});
assert.equal(data.status, 200, await data.clone().text());
const sessions = await data.json();
assert.ok(Array.isArray(sessions));
console.log(
  "PASS production reads from Neon; " + sessions.length + " real sessions",
);
