// Run with: npm test   (Node 18+, no dependencies)
const test = require("node:test");
const assert = require("node:assert");
const { parse, readNumbers } = require("../js/parser.js");

test("expense with plain digits", () => {
  const p = parse("Aaj beej par 1200 rupaye lage");
  assert.strictEqual(p.type, "e");
  assert.strictEqual(p.item, "Seed");
  assert.strictEqual(p.amount, 1200);
  assert.strictEqual(p.when, "Today");
});

test("Hindi number words: dhai hazaar = 2500", () => {
  const p = parse("Kal gehu mein khaad par dhai hazaar rupaye lage");
  assert.strictEqual(p.amount, 2500);
  assert.strictEqual(p.crop, "Wheat");
  assert.strictEqual(p.item, "Fertilizer");
  assert.strictEqual(p.when, "Yesterday");
});

test("paanch sau = 500", () => {
  assert.strictEqual(parse("Aaj mazdoori par paanch sau rupaye diye").amount, 500);
});

test("compound: do hazaar paanch sau = 2500", () => {
  assert.strictEqual(parse("Aaj diesel par do hazaar paanch sau rupaye lage").amount, 2500);
});

test("sale with rate per quintal multiplies by quantity", () => {
  const p = parse("Kal 10 quintal gehu becha 2500 rupaye quintal");
  assert.strictEqual(p.type, "s");
  assert.strictEqual(p.amount, 25000);
  assert.strictEqual(p.qty, "10 quintal");
});

test("harvest needs no amount", () => {
  const p = parse("Aaj 12 quintal dhaan kata");
  assert.strictEqual(p.type, "h");
  assert.strictEqual(p.ok, true);
  assert.strictEqual(p.crop, "Rice");
});

test("Devanagari input", () => {
  const p = parse("आज बीज पर 1200 रुपये लगे");
  assert.strictEqual(p.type, "e");
  assert.strictEqual(p.amount, 1200);
});

test("unclear speech is flagged, not saved silently", () => {
  const p = parse("kuch bhi");
  assert.strictEqual(p.ok, false);
  assert.ok(p.flags.length > 0);
});

test("readNumbers handles dhai and derh", () => {
  assert.strictEqual(readNumbers(["dhai", "sau"])[0].value, 250);
  assert.strictEqual(readNumbers(["derh", "hazaar"])[0].value, 1500);
});
