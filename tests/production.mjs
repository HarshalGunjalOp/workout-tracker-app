import assert from "node:assert/strict";

const origin = "https://form-training-mu.vercel.app";
const page = await fetch(origin);
assert.equal(page.status, 200);
assert.ok((await page.text()).includes("FORM"));
console.log("PASS production app responds with HTTP 200");

for (const path of ["/api/sessions", "/api/program?version=2"]) {
  const response = await fetch(origin + path, { cache: "no-store" });
  assert.equal(response.status, 200, path);
  const records = await response.json();
  assert.ok(Array.isArray(records));
  console.log(`PASS ${path} reads ${records.length} cloud records without device setup`);
}
