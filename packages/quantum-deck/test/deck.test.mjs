import assert from "node:assert/strict";
import test from "node:test";
import {
  SUITS,
  RANKS,
  cardId,
  createShuffledDeck,
  createStandardDeck,
  shuffleInPlace,
  randomInt,
} from "../src/deck.mjs";

test("standard deck is 52 unique ids", () => {
  const d = createStandardDeck();
  assert.equal(d.length, 52);
  const ids = new Set(d.map((c) => c.id));
  assert.equal(ids.size, 52);
  assert.equal(SUITS.length * RANKS.length, 52);
});

test("cardId matches rank+suit", () => {
  assert.equal(cardId("H", "A"), "AH");
  assert.equal(cardId("S", "10"), "10S");
});

test("shuffle preserves multiset", () => {
  const before = createStandardDeck().map((c) => c.id).sort();
  const deck = createStandardDeck();
  shuffleInPlace(deck);
  const after = deck.map((c) => c.id).sort();
  assert.deepEqual(after, before);
});

test("randomInt rejects invalid maxExclusive", () => {
  assert.throws(() => randomInt(0), RangeError);
  assert.throws(() => randomInt(-1), RangeError);
  assert.throws(() => randomInt(1.5), RangeError);
  assert.throws(() => randomInt(NaN), RangeError);
});

test("randomInt yields in-range integers under Web Crypto", () => {
  for (let i = 0; i < 200; i++) {
    const v = randomInt(52);
    assert.ok(Number.isInteger(v) && v >= 0 && v < 52, `expected 0 <= v < 52, got ${v}`);
  }
});

test("createShuffledDeck returns permuted order sometimes", () => {
  const a = createStandardDeck().map((c) => c.id).join(",");
  let different = false;
  for (let k = 0; k < 8; k++) {
    const b = createShuffledDeck().map((c) => c.id).join(",");
    if (b !== a) {
      different = true;
      break;
    }
  }
  assert.ok(different, "expected at least one shuffle to differ from sorted order (probabilistic)");
});
