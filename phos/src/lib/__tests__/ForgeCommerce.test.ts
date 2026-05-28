import { describe, it, expect, beforeEach } from "vitest";
import {
  toCents, toDollars, formatCurrency, sumLineItems, applyLineItemTax,
} from "../ForgeLedger";
import {
  exchangeCash, parseBarcodeInput,
} from "../KatenPOS";
import {
  emptyCart, cartAddItem, cartUpdateQuantity, cartRemoveItem, toLineItems,
  BAKERY_PRESETS,
} from "../KatenPOS";
import { ForgeLoveCredits } from "../ForgeLoveCredits";
import { KarmaEngine } from "../KarmaEngine";

// ─── Crypto stub for PGLite mock ───
if (typeof crypto === "undefined" || !crypto.subtle) {
  (globalThis as any).crypto = {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    },
    subtle: {} as any,
    randomUUID: () => Math.random().toString(36).slice(2),
  };
}

// ═══════════════════════════════════════════════════════════════
// FORGE LEDGER — Integer math
// ═══════════════════════════════════════════════════════════════

describe("ForgeLedger - integer math", () => {
  describe("toCents / toDollars", () => {
    it("converts dollars to cents", () => {
      expect(toCents(1.00)).toBe(100);
      expect(toCents(0.01)).toBe(1);
      expect(toCents(8.50)).toBe(850);
      expect(toCents(0)).toBe(0);
    });

    it("rounds correctly", () => {
      expect(toCents(0.005)).toBe(1);
      expect(toCents(0.004)).toBe(0);
      expect(toCents(1.999)).toBe(200);
    });

    it("converts cents to dollars", () => {
      expect(toDollars(100)).toBe(1);
      expect(toDollars(1)).toBe(0.01);
      expect(toDollars(850)).toBe(8.5);
      expect(toDollars(0)).toBe(0);
    });
  });

  describe("formatCurrency", () => {
    it("formats cents as currency string", () => {
      expect(formatCurrency(0)).toBe("$0.00");
      expect(formatCurrency(100)).toBe("$1.00");
      expect(formatCurrency(850)).toBe("$8.50");
      expect(formatCurrency(1234)).toBe("$12.34");
      expect(formatCurrency(-500)).toBe("-$5.00");
    });

    it("formats large values", () => {
      expect(formatCurrency(100000)).toBe("$1000.00");
      expect(formatCurrency(999999)).toBe("$9999.99");
    });
  });

  describe("sumLineItems", () => {
    it("calculates correct subtotal, tax, and total", () => {
      const items = [
        { sku: "BREAD", name: "Bread", quantity: 2, unitPriceCents: 800 },
        { sku: "COFFEE", name: "Coffee", quantity: 1, unitPriceCents: 300 },
      ];
      const result = sumLineItems(items);
      expect(result.subtotalCents).toBe(1900);
      expect(result.taxCents).toBe(76);
      expect(result.totalCents).toBe(1976);
    });

    it("handles empty items", () => {
      const result = sumLineItems([]);
      expect(result.subtotalCents).toBe(0);
      expect(result.taxCents).toBe(0);
      expect(result.totalCents).toBe(0);
    });

    it("handles single item", () => {
      const result = sumLineItems([{ sku: "X", name: "X", quantity: 1, unitPriceCents: 100 }]);
      expect(result.subtotalCents).toBe(100);
      expect(result.taxCents).toBe(4);
      expect(result.totalCents).toBe(104);
    });

    it("tax rounds to nearest cent", () => {
      // 1 * 33c = 33c subtotal, tax = 1.32c → rounds to 1c
      const result = sumLineItems([{ sku: "X", name: "X", quantity: 1, unitPriceCents: 33 }]);
      expect(result.taxCents).toBe(1);
      expect(result.totalCents).toBe(34);
    });

    it("handles Georgia 4% tax on odd amounts", () => {
      // 99c * 4% = 3.96c → rounds to 4c
      const result = sumLineItems([{ sku: "X", name: "X", quantity: 1, unitPriceCents: 99 }]);
      expect(result.taxCents).toBe(4);
      expect(result.totalCents).toBe(103);
    });
  });

  describe("applyLineItemTax", () => {
    it("computes per-item tax correctly", () => {
      const item = { sku: "X", name: "X", quantity: 3, unitPriceCents: 100 };
      const result = applyLineItemTax(item);
      expect(result.totalPriceCents).toBe(300);
      expect(result.taxCents).toBe(12);
    });

    it("zero-price item has zero tax", () => {
      const item = { sku: "FREE", name: "Free", quantity: 1, unitPriceCents: 0 };
      const result = applyLineItemTax(item);
      expect(result.totalPriceCents).toBe(0);
      expect(result.taxCents).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// KATEN POS — Barcode parsing
// ═══════════════════════════════════════════════════════════════

describe("KatenPOS - barcode parsing", () => {
  it("parses barcode with price", () => {
    const result = parseBarcodeInput("/BREAD-SOUR:800");
    expect(result).toEqual({ sku: "BREAD-SOUR", priceCents: 800 });
  });

  it("parses barcode without price", () => {
    const result = parseBarcodeInput("/BREAD-SOUR");
    expect(result).toEqual({ sku: "BREAD-SOUR", priceCents: 0 });
  });

  it("returns null for non-barcode input", () => {
    expect(parseBarcodeInput("BREAD-SOUR")).toBeNull();
    expect(parseBarcodeInput("")).toBeNull();
    expect(parseBarcodeInput("/")).toBeNull();
  });

  it("rejects negative prices", () => {
    expect(parseBarcodeInput("/SKU:-100")).toBeNull();
  });

  it("handles whitespace in SKU", () => {
    const result = parseBarcodeInput("/BREAD SOUR:800");
    expect(result).toEqual({ sku: "BREAD SOUR", priceCents: 800 });
  });

  it("handles large prices", () => {
    const result = parseBarcodeInput("/ITEM:999999");
    expect(result).toEqual({ sku: "ITEM", priceCents: 999999 });
  });
});

// ═══════════════════════════════════════════════════════════════
// KATEN POS — Cash exchange
// ═══════════════════════════════════════════════════════════════

describe("KatenPOS - cash exchange", () => {
  it("calculates correct change", () => {
    const result = exchangeCash(850, 10.00);
    expect(result.cashReceivedCents).toBe(1000);
    expect(result.changeCents).toBe(150);
    expect(result.shortfall).toBe(false);
  });

  it("detects shortfall", () => {
    const result = exchangeCash(850, 5.00);
    expect(result.changeCents).toBe(-350);
    expect(result.shortfall).toBe(true);
  });

  it("handles exact change", () => {
    const result = exchangeCash(850, 8.50);
    expect(result.changeCents).toBe(0);
    expect(result.shortfall).toBe(false);
  });

  it("zero cart total", () => {
    const result = exchangeCash(0, 5.00);
    expect(result.changeCents).toBe(500);
    expect(result.shortfall).toBe(false);
  });

  it("handles bill rounding", () => {
    const result = exchangeCash(99, 1.00);
    expect(result.changeCents).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// KATEN POS — Cart engine
// ═══════════════════════════════════════════════════════════════

describe("KatenPOS - cart engine", () => {
  it("starts empty", () => {
    const cart = emptyCart();
    expect(cart.items).toHaveLength(0);
    expect(cart.totalCents).toBe(0);
  });

  it("adds item to cart", () => {
    let cart = emptyCart();
    cart = cartAddItem(cart, { sku: "BREAD", name: "Bread", unitPriceCents: 800 });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(1);
    expect(cart.subtotalCents).toBe(800);
  });

  it("increments quantity for same SKU", () => {
    let cart = emptyCart();
    cart = cartAddItem(cart, { sku: "BREAD", name: "Bread", unitPriceCents: 800 });
    cart = cartAddItem(cart, { sku: "BREAD", name: "Bread", unitPriceCents: 800 });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
    expect(cart.items[0].totalPriceCents).toBe(1600);
  });

  it("adds multiple different items", () => {
    let cart = emptyCart();
    cart = cartAddItem(cart, { sku: "BREAD", name: "Bread", unitPriceCents: 800 });
    cart = cartAddItem(cart, { sku: "COFFEE", name: "Coffee", unitPriceCents: 300 });
    expect(cart.items).toHaveLength(2);
    expect(cart.subtotalCents).toBe(1100);
  });

  it("updates quantity", () => {
    let cart = emptyCart();
    cart = cartAddItem(cart, { sku: "BREAD", name: "Bread", unitPriceCents: 800 });
    const cartId = cart.items[0].cartId;
    cart = cartUpdateQuantity(cart, cartId, 3);
    expect(cart.items[0].quantity).toBe(3);
  });

  it("removes item when quantity set to 0", () => {
    let cart = emptyCart();
    cart = cartAddItem(cart, { sku: "BREAD", name: "Bread", unitPriceCents: 800 });
    const cartId = cart.items[0].cartId;
    cart = cartUpdateQuantity(cart, cartId, 0);
    expect(cart.items).toHaveLength(0);
  });

  it("removes item directly", () => {
    let cart = emptyCart();
    cart = cartAddItem(cart, { sku: "BREAD", name: "Bread", unitPriceCents: 800 });
    cart = cartAddItem(cart, { sku: "COFFEE", name: "Coffee", unitPriceCents: 300 });
    cart = cartRemoveItem(cart, cart.items[0].cartId);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].sku).toBe("COFFEE");
  });

  it("calculates tax on line items", () => {
    let cart = emptyCart();
    cart = cartAddItem(cart, { sku: "BREAD", name: "Bread", unitPriceCents: 800 });
    expect(cart.taxCents).toBe(32);
    expect(cart.totalCents).toBe(832);
  });

  it("converts cart to line items", () => {
    let cart = emptyCart();
    cart = cartAddItem(cart, { sku: "BREAD", name: "Bread", unitPriceCents: 800 });
    cart = cartAddItem(cart, { sku: "COFFEE", name: "Coffee", unitPriceCents: 300, quantity: 2 });
    const lineItems = toLineItems(cart);
    expect(lineItems).toHaveLength(2);
    expect(lineItems[1].quantity).toBe(2);
  });

  it("tracks item count across quantities", () => {
    let cart = emptyCart();
    cart = cartAddItem(cart, { sku: "X", name: "X", unitPriceCents: 100 });
    cart = cartAddItem(cart, { sku: "X", name: "X", unitPriceCents: 100 });
    cart = cartAddItem(cart, { sku: "Y", name: "Y", unitPriceCents: 200 });
    expect(cart.itemCount).toBe(3);
  });

  it("no floating-point drift in totals", () => {
    let cart = emptyCart();
    cart = cartAddItem(cart, { sku: "X", name: "X", unitPriceCents: 33 });
    cart = cartAddItem(cart, { sku: "X", name: "X", unitPriceCents: 33 });
    cart = cartAddItem(cart, { sku: "X", name: "X", unitPriceCents: 33 });
    expect(cart.subtotalCents).toBe(99);
  });

  it("handles large quantities", () => {
    let cart = emptyCart();
    cart = cartAddItem(cart, { sku: "X", name: "X", unitPriceCents: 100, quantity: 999 });
    expect(cart.subtotalCents).toBe(99900);
  });

  it("handles zero-price items", () => {
    let cart = emptyCart();
    cart = cartAddItem(cart, { sku: "FREE", name: "Free", unitPriceCents: 0 });
    expect(cart.subtotalCents).toBe(0);
    expect(cart.totalCents).toBe(0);
  });

  it("all bakery presets have valid prices", () => {
    for (const preset of BAKERY_PRESETS) {
      expect(preset.unitPriceCents).toBeGreaterThan(0);
      expect(Number.isInteger(preset.unitPriceCents)).toBe(true);
      expect(preset.sku.length).toBeGreaterThan(0);
      expect(preset.name.length).toBeGreaterThan(0);
    }
  });

  it("bakery presets count", () => {
    expect(BAKERY_PRESETS.length).toBe(12);
  });
});

// ═══════════════════════════════════════════════════════════════
// FORGE LOVE CREDITS
// ═══════════════════════════════════════════════════════════════

describe("ForgeLoveCredits", () => {
  beforeEach(() => {
    KarmaEngine.reset();
  });

  it("starts with zero balance", () => {
    expect(ForgeLoveCredits.getBalanceCents()).toBe(0);
  });

  it("awards LOVE credits", () => {
    const newBal = ForgeLoveCredits.awardLove(5000, "Test award");
    expect(newBal).toBe(5000);
    expect(ForgeLoveCredits.getBalanceCents()).toBe(5000);
  });

  it("accumulates LOVE credits", () => {
    ForgeLoveCredits.awardLove(3000, "First");
    ForgeLoveCredits.awardLove(2000, "Second");
    expect(ForgeLoveCredits.getBalanceCents()).toBe(5000);
  });

  it("canPay returns true when balance is sufficient", () => {
    ForgeLoveCredits.awardLove(5000, "Test");
    expect(ForgeLoveCredits.canPay(3000)).toBe(true);
  });

  it("canPay returns false when balance is insufficient", () => {
    ForgeLoveCredits.awardLove(1000, "Test");
    expect(ForgeLoveCredits.canPay(2000)).toBe(false);
  });

  it("canPay returns true for zero-cost cart", () => {
    expect(ForgeLoveCredits.canPay(0)).toBe(true);
  });

  it("reverseLovePayment restores balance", () => {
    ForgeLoveCredits.awardLove(5000, "Initial");
    ForgeLoveCredits.reverseLovePayment("tx_1", 3000, "Test reversal");
    expect(ForgeLoveCredits.getBalanceCents()).toBe(8000);
  });

  it("multiple awards and reversals maintain integer accuracy", () => {
    ForgeLoveCredits.awardLove(100, "a");
    ForgeLoveCredits.awardLove(200, "b");
    ForgeLoveCredits.awardLove(300, "c");
    ForgeLoveCredits.reverseLovePayment("tx", 50, "r");
    expect(ForgeLoveCredits.getBalanceCents()).toBe(650);
  });
});

// ═══════════════════════════════════════════════════════════════
// FORGE INVENTORY
// ═══════════════════════════════════════════════════════════════

describe("ForgeInventory - bakery preset SKU integrity", () => {
  it("all presets have unique SKUs", () => {
    const skus = BAKERY_PRESETS.map((p) => p.sku);
    const unique = new Set(skus);
    expect(unique.size).toBe(skus.length);
  });

  it("all preset SKUs are uppercase", () => {
    for (const p of BAKERY_PRESETS) {
      expect(p.sku).toBe(p.sku.toUpperCase());
    }
  });

  it("preset prices round-trip through toCents", () => {
    // 8.00 → 800c → $8.00
    const dollars = 8.00;
    const cents = toCents(dollars);
    expect(formatCurrency(cents)).toBe("$8.00");
  });
});

// ═══════════════════════════════════════════════════════════════
// FLOATING-POINT SAFETY
// ═══════════════════════════════════════════════════════════════

describe("Floating-point safety", () => {
  it("toCents handles classic FP issue 0.1 + 0.2", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS
    // toCents uses Math.round, so this should still work
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it("sumLineItems never produces fractional cents", () => {
    const items = [
      { sku: "A", name: "A", quantity: 7, unitPriceCents: 33 },
      { sku: "B", name: "B", quantity: 3, unitPriceCents: 67 },
    ];
    const result = sumLineItems(items);
    expect(Number.isInteger(result.subtotalCents)).toBe(true);
    expect(Number.isInteger(result.taxCents)).toBe(true);
    expect(Number.isInteger(result.totalCents)).toBe(true);
  });

  it("cart total is always integer", () => {
    let cart = emptyCart();
    cart = cartAddItem(cart, { sku: "X", name: "X", unitPriceCents: 199 });
    cart = cartAddItem(cart, { sku: "Y", name: "Y", unitPriceCents: 299 });
    cart = cartAddItem(cart, { sku: "Z", name: "Z", unitPriceCents: 99 });
    expect(Number.isInteger(cart.subtotalCents)).toBe(true);
    expect(Number.isInteger(cart.taxCents)).toBe(true);
    expect(Number.isInteger(cart.totalCents)).toBe(true);
  });

  it("exchangeCash never produces fractional cents", () => {
    for (let total = 0; total <= 1000; total += 13) {
      for (let cash = 0; cash <= 20; cash += 0.25) {
        const result = exchangeCash(total, cash);
        expect(Number.isInteger(result.cashReceivedCents)).toBe(true);
        expect(Number.isInteger(result.changeCents)).toBe(true);
      }
    }
  });
});
