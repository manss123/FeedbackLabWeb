import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { z } from "zod";

const module = { exports: {} };
runInNewContext(
  ts.transpileModule(readFileSync("src/lib/consent-details.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { module, exports: module.exports, require: () => ({ z }) },
);
const { consentDetailsSchema: schema, CONSENT_DOCUMENTS: documents } = module.exports;
const valid = {
  fullName: "  สมชาย ใจดี  ",
  age: "18",
  houseNumber: "1/2",
  road: "",
  subdistrict: "ศาลายา",
  district: "พุทธมณฑล",
  province: "นครปฐม",
  postalCode: "73170",
  phone: "081-234-5678",
};
test("consent requires an adult and manually supplied identity and contact fields", () => {
  const parsed = schema.parse(valid);
  assert.equal(parsed.fullName, "สมชาย ใจดี");
  assert.equal(parsed.age, 18);
  for (const patch of [
    { fullName: " " },
    { age: "17" },
    { age: "18.5" },
    { age: "" },
    { houseNumber: "" },
    { province: "" },
    { postalCode: "1234" },
    { phone: "abc" },
  ])
    assert.equal(schema.safeParse({ ...valid, ...patch }).success, false);
});
test("both source PDFs and every readable preview page are shipped", () => {
  assert.equal(documents.length, 2);
  for (const doc of documents) {
    assert.equal(
      readFileSync(`public/documents/consent/${doc.id}.pdf`).subarray(0, 4).toString(),
      "%PDF",
    );
    for (let i = 1; i <= doc.pages; i++)
      assert.ok(existsSync(`public/documents/consent/${doc.id}-${i}.webp`));
  }
});
