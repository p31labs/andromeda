/**
 * KatenPOS.ts — Offline-first point-of-sale engine for pop-up retail.
 *
 * Bakery mode: line items with SKU, quantity, unit price (cents).
 * Hardware input: barcode scanner (keyboard wedge on "/" prefix), Stripe Terminal (webhook-ready).
 * Offline: all transactions written to PGLite forge_transactions immediately.
 * Online: ForgeSync pushes to edge for reconciliation.
 */

import { toCents, formatCurrency, applyLineItemTax } from "./ForgeLedger";
import type { LineItem, TxType, PaymentMethod } from "./ForgeLedger";

export interface CartItem extends LineItem {
  cartId: string;
  addedAt: number;
}

export interface CartState {
  items: CartItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  itemCount: number;
}

export function emptyCart(): CartState {
  return { items: [], subtotalCents: 0, taxCents: 0, totalCents: 0, itemCount: 0 };
}

export function cartAddItem(
  cart: CartState,
  item: { sku: string; name: string; unitPriceCents: number; quantity?: number }
): CartState {
  const qty = item.quantity ?? 1;
  const existing = cart.items.find((i) => i.sku === item.sku);
  let newItems: CartItem[];

  if (existing) {
    newItems = cart.items.map((i) =>
      i.sku === item.sku
        ? { ...applyLineItemTax({
            sku: item.sku,
            name: item.name,
            quantity: i.quantity + qty,
            unitPriceCents: item.unitPriceCents,
          }), cartId: i.cartId, addedAt: i.addedAt }
        : i
    );
  } else {
    const withTax = applyLineItemTax({
      sku: item.sku,
      name: item.name,
      quantity: qty,
      unitPriceCents: item.unitPriceCents,
    });
    newItems = [...cart.items, { ...withTax, cartId: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, addedAt: Date.now() }];
  }

  return recalcCart(newItems);
}

export function cartUpdateQuantity(cart: CartState, cartId: string, quantity: number): CartState {
  if (quantity <= 0) {
    return recalcCart(cart.items.filter((i) => i.cartId !== cartId));
  }
  const newItems = cart.items.map((i) =>
    i.cartId === cartId
      ? { ...applyLineItemTax({ sku: i.sku, name: i.name, quantity, unitPriceCents: i.unitPriceCents }), cartId: i.cartId, addedAt: i.addedAt }
      : i
  );
  return recalcCart(newItems);
}

export function cartRemoveItem(cart: CartState, cartId: string): CartState {
  return recalcCart(cart.items.filter((i) => i.cartId !== cartId));
}

function recalcCart(items: CartItem[]): CartState {
  let subtotalCents = 0;
  let taxCents = 0;
  for (const item of items) {
    subtotalCents += item.unitPriceCents * item.quantity;
    taxCents += item.taxCents;
  }
  const totalCents = subtotalCents + taxCents;
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  return { items, subtotalCents, taxCents, totalCents, itemCount };
}

export function toLineItems(cart: CartState): Omit<LineItem, "totalPriceCents" | "taxCents">[] {
  return cart.items.map((i) => ({
    sku: i.sku,
    name: i.name,
    quantity: i.quantity,
    unitPriceCents: i.unitPriceCents,
  }));
}

export function exchangeCash(totalCents: number, cashReceivedDollars: number): {
  cashReceivedCents: number;
  changeCents: number;
  shortfall: boolean;
} {
  const cashReceivedCents = toCents(cashReceivedDollars);
  const changeCents = cashReceivedCents - totalCents;
  return { cashReceivedCents, changeCents, shortfall: changeCents < 0 };
}

// Barcode scanner input handler (keyboard wedge simulation)
// Scanners send keystrokes — prefix "/" indicates barcode scan
export function parseBarcodeInput(input: string): { sku: string; priceCents: number } | null {
  if (!input.startsWith("/")) return null;
  const raw = input.slice(1).trim();
  if (!raw) return null;
  // Format: SKU:PRICE or just SKU (look up price)
  const parts = raw.split(":");
  if (parts.length === 2) {
    const priceCents = parseInt(parts[1].trim(), 10);
    if (isNaN(priceCents) || priceCents < 0) return null;
    return { sku: parts[0].trim(), priceCents };
  }
  return { sku: raw, priceCents: 0 };
}

// Quick-add common bakery items
export const BAKERY_PRESETS = [
  { sku: "BREAD-SOUR", name: "Sourdough Loaf", unitPriceCents: toCents(8.00) },
  { sku: "BREAD-RYE", name: "Rye Loaf", unitPriceCents: toCents(7.50) },
  { sku: "PASTRY-CROIS", name: "Butter Croissant", unitPriceCents: toCents(4.50) },
  { sku: "PASTRY-DANISH", name: "Danish", unitPriceCents: toCents(4.00) },
  { sku: "MUFFIN-BLUE", name: "Blueberry Muffin", unitPriceCents: toCents(3.50) },
  { sku: "COOKIE-CHOC", name: "Chocolate Chip Cookie", unitPriceCents: toCents(2.50) },
  { sku: "COFFEE-12OZ", name: "Coffee 12oz", unitPriceCents: toCents(3.00) },
  { sku: "COFFEE-16OZ", name: "Coffee 16oz", unitPriceCents: toCents(4.00) },
  { sku: "TEA-HOT", name: "Hot Tea", unitPriceCents: toCents(3.00) },
  { sku: "BOX-6PK", name: "Cookie 6-Pack", unitPriceCents: toCents(12.00) },
  { sku: "MIX-PANCAKE", name: "Pancake Mix", unitPriceCents: toCents(6.50) },
  { sku: "JAM-HOUSE", name: "House Jam 8oz", unitPriceCents: toCents(5.00) },
];
