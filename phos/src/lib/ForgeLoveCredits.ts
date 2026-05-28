/**
 * ForgeLoveCredits.ts — LOVE credits payment integration for the Forge POS.
 *
 * Bridges KarmaEngine (localStorage LOVE balance) with the ForgeLedger (PGLite
 * hash-chained transactions). Allows customers to pay with LOVE credits earned
 * through care, creation, and consistency.
 *
 * Flow:
 * 1. Customer selects "LOVE" payment method at POS
 * 2. ForgeLoveCredits checks KarmaEngine balance (cents)
 * 3. If sufficient, deducts from KarmaEngine and records SALE in ForgeLedger
 * 4. Creates a paired LOVE transaction (negative) in KarmaEngine history
 * 5. All values in integer cents — zero floating-point
 *
 * Offline-first: KarmaEngine lives in localStorage (always available).
 * Ledger write goes to PGLite. Sync happens when edge reachable.
 */

import { KarmaEngine } from "./KarmaEngine";
import { recordTransaction, toCents } from "./ForgeLedger";
import type { PaymentMethod } from "./ForgeLedger";
import type { CartState, CartItem } from "./KatenPOS";

export interface LovePaymentResult {
  success: boolean;
  balanceCentsAfter: number | null;
  error: string | null;
  txId: string | null;
}

export class ForgeLoveCredits {
  /**
   * Get current LOVE balance in cents.
   */
  static getBalanceCents(): number {
    return KarmaEngine.getBalanceCents();
  }

  /**
   * Check if the cart can be paid with LOVE credits.
   */
  static canPay(cartTotalCents: boolean): boolean {
    if (!cartTotalCents) return true;
    return KarmaEngine.getBalanceCents() >= (cartTotalCents as unknown as number);
  }

  /**
   * Process a LOVE credits payment for the given cart.
   * Deducts from KarmaEngine, records in ForgeLedger.
   *
   * @param cart — The cart to pay for
   * @returns LovePaymentResult with success/failure details
   */
  static async payWithLove(cart: CartState): Promise<LovePaymentResult> {
    const totalCents = cart.totalCents;

    if (totalCents <= 0) {
      return { success: true, balanceCentsAfter: this.getBalanceCents(), error: null, txId: null };
    }

    const balanceCents = KarmaEngine.getBalanceCents();
    if (balanceCents < totalCents) {
      return {
        success: false,
        balanceCentsAfter: balanceCents,
        error: `Ins LOVE credits. Balance: ${balanceCents}c, Need: ${totalCents}c`,
        txId: null,
      };
    }

    try {
      const tx = await recordTransaction({
        type: "SALE",
        items: cart.items.map((i) => ({
          sku: i.sku,
          name: i.name,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
        })),
        paymentMethod: "love_credits",
        note: `LOVE payment: ${cart.itemCount} items`,
      });

      // Deduct from KarmaEngine
      KarmaEngine.addLove(-totalCents, `POS Purchase: ${cart.items.map((i) => `${i.name}×${i.quantity}`).join(", ")}`);

      const newBalance = KarmaEngine.getBalanceCents();

      return { success: true, balanceCentsAfter: newBalance, error: null, txId: tx.id };
    } catch (err) {
      return {
        success: false,
        balanceCentsAfter: KarmaEngine.getBalanceCents(),
        error: err instanceof Error ? err.message : "LOVE payment failed",
        txId: null,
      };
    }
  }

  /**
   * Award LOVE credits (e.g., for returns, promotions, or manual credit).
   */
  static awardLove(cents: number, reason: string): number {
    return KarmaEngine.addLove(cents, reason);
  }

  /**
   * Reverse a LOVE payment — restore the credits.
   */
  static async reverseLovePayment(originalTxId: string, totalCents: number, reason: string): Promise<LovePaymentResult> {
    try {
      KarmaEngine.addLove(totalCents, `Reversal: ${reason}`);
      return { success: true, balanceCentsAfter: KarmaEngine.getBalanceCents(), error: null, txId: originalTxId };
    } catch (err) {
      return {
        success: false,
        balanceCentsAfter: KarmaEngine.getBalanceCents(),
        error: err instanceof Error ? err.message : "Reversal failed",
        txId: null,
      };
    }
  }
}
