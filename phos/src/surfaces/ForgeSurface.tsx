import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAtmosphere } from "../components/AtmosphereProvider";
import {
  recordTransaction, getTransactions, voidTransaction, getBalanceCents,
  getDailyTotal, getDailyTotals, toCents, formatCurrency, sumLineItems,
  type ForgeTransaction, type PaymentMethod,
} from "../lib/ForgeLedger";
import {
  emptyCart, cartAddItem, cartUpdateQuantity, cartRemoveItem,
  toLineItems, exchangeCash, parseBarcodeInput, BAKERY_PRESETS,
  type CartState,
} from "../lib/KatenPOS";
import { ForgeReconciler } from "../lib/ForgeSync";
import {
  upsertProduct, getProducts, getProduct, deactivateProduct,
  recordStockMovement, getStockMovements, getStockLevels, getStockForSku,
  type Product, type StockMovement,
} from "../lib/ForgeInventory";
import { ForgeLoveCredits } from "../lib/ForgeLoveCredits";

type ForgeTab = "pos" | "vault" | "warehouse";

export const ForgeSurface: React.FC<{ className?: string }> = ({ className }) => {
  const { grayRock, spoons } = useAtmosphere();
  const [tab, setTab] = useState<ForgeTab>("pos");

  if (grayRock) {
    return (
      <div className={className}>
        <div className="text-center py-12 text-zinc-500 font-mono text-sm">Forge suspended. Gray Rock active.</div>
      </div>
    );
  }

  const visibleTabs: ForgeTab[] = spoons <= 1 ? ['pos'] : ['pos', 'vault', 'warehouse'];

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: "#f59e0b" }}>The Forge</h1>
          <p className="text-[10px]" style={{ color: "#664422" }}>
            Revenue tools · Offline-first POS · Integer-math ledger
          </p>
        </div>
      </div>
      <div className="flex gap-1 mb-4">
        {([
          { key: "pos" as const, label: "\uD83D\uDECB POS" },
          { key: "vault" as const, label: "\uD83C\uDDFE Vault" },
          { key: "warehouse" as const, label: "\uD83D\uDCE6 Warehouse" },
        ]).filter((t) => visibleTabs.includes(t.key)).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 py-2 text-[10px] rounded-lg"
            style={{
              backgroundColor: tab === t.key ? "rgba(245,158,11,0.15)" : "transparent",
              border: `1px solid ${tab === t.key ? "rgba(245,158,11,0.3)" : "rgba(102,68,34,0.2)"}`,
              color: tab === t.key ? "#f59e0b" : "#664422",
            }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "pos" && <POSTab />}
      {tab === "vault" && <VaultTab />}
      {tab === "warehouse" && <WarehouseTab />}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// KATEN POS TAB
// ═══════════════════════════════════════════════════════════════

function POSTab() {
  const [cart, setCart] = useState<CartState>(emptyCart());
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHistory, setTxHistory] = useState<ForgeTransaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [inputBuffer, setInputBuffer] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [dailyTax, setDailyTax] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loveBalance, setLoveBalance] = useState(0);
  const [reconciler] = useState(() => new ForgeReconciler());
  const [syncStatus, setSyncStatus] = useState("");
  const [showVoidConfirm, setShowVoidConfirm] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const txs = await getTransactions(20);
      setTxHistory(txs);
      const today = new Date().toISOString().split("T")[0];
      const daily = await getDailyTotal(today);
      setDailyRevenue(daily?.revenueCents || 0);
      setDailyTax(daily?.taxCents || 0);
      const siteId = localStorage.getItem("phos_site_id") || "default";
      const bal = await getBalanceCents(siteId);
      setCurrentBalance(bal);
      setLoveBalance(ForgeLoveCredits.getBalanceCents());
    } catch { /* offline — keep stale data */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { const i = setInterval(loadData, 10000); return () => clearInterval(i); }, [loadData]);

  const handleQuickAdd = useCallback(async (preset: typeof BAKERY_PRESETS[number]) => {
    // Check product catalog for custom price override
    const product = await getProduct(preset.sku);
    if (product && product.priceCents !== preset.unitPriceCents) {
      setCart((prev) => cartAddItem(prev, { sku: preset.sku, name: product.name || preset.name, unitPriceCents: product.priceCents }));
    } else {
      setCart((prev) => cartAddItem(prev, preset));
    }
  }, []);

  const handleInputKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const value = inputBuffer.trim();
      if (!value) return;

      const barcode = parseBarcodeInput(value);
      if (barcode) {
        // Look up product by SKU for name/price
        if (barcode.priceCents > 0) {
          setCart((prev) => cartAddItem(prev, { sku: barcode.sku, name: barcode.sku, unitPriceCents: barcode.priceCents }));
        } else {
          const product = await getProduct(barcode.sku);
          if (product) {
            setCart((prev) => cartAddItem(prev, { sku: product.sku, name: product.name, unitPriceCents: product.priceCents }));
          } else {
            setCart((prev) => cartAddItem(prev, { sku: barcode.sku, name: barcode.sku, unitPriceCents: 0 }));
          }
        }
      } else if (value.startsWith("+")) {
        const sku = value.slice(1).trim();
        const preset = BAKERY_PRESETS.find((p) => p.sku === sku);
        if (preset) {
          handleQuickAdd(preset);
        } else {
          const product = await getProduct(sku);
          if (product) {
            setCart((prev) => cartAddItem(prev, { sku: product.sku, name: product.name, unitPriceCents: product.priceCents }));
          }
        }
      }

      setInputBuffer("");
      inputRef.current?.focus();
    }
  }, [inputBuffer, handleQuickAdd]);

  const handleCheckout = useCallback(async () => {
    if (cart.items.length === 0) return;

    if (paymentMethod === "cash") {
      const cash = parseFloat(cashReceived);
      if (isNaN(cash) || cash <= 0) { setErrorMsg("Enter cash received"); return; }
      const { shortfall } = exchangeCash(cart.totalCents, cash);
      if (shortfall) { setErrorMsg(`Short ${formatCurrency(cart.totalCents - toCents(cash))} needed`); return; }
    }

    if (paymentMethod === "love_credits") {
      const lb = ForgeLoveCredits.getBalanceCents();
      if (lb < cart.totalCents) { setErrorMsg(`Ins LOVE credits. Balance: ${formatCurrency(lb)}`); return; }
    }

    if (paymentMethod === "stripe_terminal") {
      setErrorMsg("Stripe Terminal SDK not connected. Use Cash, Manual, or LOVE.");
      return;
    }

    setStatus("processing");
    setErrorMsg("");

    try {
      if (paymentMethod === "love_credits") {
        const result = await ForgeLoveCredits.payWithLove(cart);
        if (!result.success) {
          setStatus("error");
          setErrorMsg(result.error || "LOVE payment failed");
          setTimeout(() => setStatus("idle"), 5000);
          return;
        }
      } else {
        await recordTransaction({
          type: "SALE",
          items: toLineItems(cart),
          paymentMethod,
          note: paymentMethod === "cash" && cashReceived ? `Cash: $${cashReceived}` : "",
        });
      }

      // Decrement stock for each item in catalog
      for (const item of cart.items) {
        try {
          await recordStockMovement({ sku: item.sku, quantity: -(item.quantity ?? 1), reason: `Sale: ${item.name}` });
        } catch { /* inventory tracking is best-effort */ }
      }

      setStatus("complete");
      setCart(emptyCart());
      setCashReceived("");
      await loadData();
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Checkout failed");
      setTimeout(() => setStatus("idle"), 5000);
    }
  }, [cart, paymentMethod, cashReceived, loadData]);

  const handleVoid = useCallback(async (txId: string) => {
    setShowVoidConfirm(txId);
  }, []);

  const confirmVoid = useCallback(async () => {
    if (!showVoidConfirm) return;
    try {
      const tx = txHistory.find((t) => t.id === showVoidConfirm);
      if (tx && tx.paymentMethod === "love_credits") {
        await ForgeLoveCredits.reverseLovePayment(tx.id, tx.totalCents, "POS void");
      }
      await voidTransaction(showVoidConfirm, "POS void");
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Void failed");
    }
    setShowVoidConfirm(null);
  }, [showVoidConfirm, txHistory, loadData]);

  const handleSync = useCallback(async () => {
    setSyncStatus("syncing...");
    try {
      const edgeBase = localStorage.getItem("phos_edge_url") || "";
      const result = await reconciler.reconcile(edgeBase);
      setSyncStatus(`Pushed ${result.pushed}, confirmed ${result.confirmed}${result.conflicts ? `, ${result.conflicts} conflicts` : ""}`);
      await loadData();
      setTimeout(() => setSyncStatus(""), 5000);
    } catch {
      setSyncStatus("Sync failed — offline");
      setTimeout(() => setSyncStatus(""), 5000);
    }
  }, [reconciler, loadData]);

  const cashCalc = paymentMethod === "cash" && cashReceived
    ? exchangeCash(cart.totalCents, parseFloat(cashReceived) || 0)
    : null;

  return (
    <div className="space-y-3">
      {/* Void confirmation modal */}
      {showVoidConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
          <div className="p-6 rounded-xl max-w-sm w-full mx-4" style={{ backgroundColor: "#1a0a00", border: "1px solid rgba(239,68,68,0.3)" }}>
            <p className="text-sm mb-4" style={{ color: "#f59e0b" }}>Void this transaction? A reversal record will be created.</p>
            <div className="flex gap-2">
              <button onClick={confirmVoid} className="flex-1 py-2 text-[10px] rounded-lg font-bold" style={{ backgroundColor: "#ef4444", color: "#fff" }}>Confirm Void</button>
              <button onClick={() => setShowVoidConfirm(null)} className="flex-1 py-2 text-[10px] rounded-lg" style={{ border: "1px solid rgba(102,68,34,0.3)", color: "#8a6830" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="text-lg font-bold" style={{ color: "#f59e0b" }}>{txHistory.filter((t) => !t.voided && t.type === "SALE").length}</div>
          <div className="text-[9px]" style={{ color: "#664422" }}>Sales</div>
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="text-lg font-bold" style={{ color: "#f59e0b" }}>{formatCurrency(dailyRevenue)}</div>
          <div className="text-[9px]" style={{ color: "#664422" }}>Revenue</div>
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="text-lg font-bold" style={{ color: "#f59e0b" }}>{formatCurrency(currentBalance)}</div>
          <div className="text-[9px]" style={{ color: "#664422" }}>Balance</div>
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="text-lg font-bold" style={{ color: "#a78bfa" }}>{formatCurrency(loveBalance)}</div>
          <div className="text-[9px]" style={{ color: "#664422" }}>LOVE</div>
        </div>
      </div>

      {/* Quick-add grid */}
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#8a6830" }}>Quick Add — Touch or /SKU Enter</div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {BAKERY_PRESETS.map((preset) => (
            <button key={preset.sku} onClick={() => handleQuickAdd(preset)}
              className="p-2 rounded-lg text-left transition-all active:scale-95"
              style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="text-[10px] font-medium truncate" style={{ color: "#f59e0b" }}>{preset.name}</div>
              <div className="text-[9px]" style={{ color: "#8a6830" }}>{formatCurrency(preset.unitPriceCents)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Barcode / SKU input */}
      <div>
        <input ref={inputRef} type="text" value={inputBuffer}
          onChange={(e) => setInputBuffer(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="/BARCODE:450 or +BREAD-SOUR — Enter to add"
          className="w-full p-3 text-xs rounded-lg font-mono"
          style={{ backgroundColor: "rgba(10,5,5,0.6)", border: "1px solid rgba(102,68,34,0.3)", color: "#fcd34d" }}
        />
      </div>

      {/* Cart */}
      <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(10,5,5,0.4)", border: "1px solid rgba(102,68,34,0.3)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "#f59e0b" }}>
            Cart ({cart.itemCount} items)
          </div>
          {cart.items.length > 0 && (
            <button onClick={() => setCart(emptyCart())} className="text-[10px]" style={{ color: "#8a6830" }}>Clear</button>
          )}
        </div>

        {cart.items.length === 0 ? (
          <p className="text-[10px] text-center py-4" style={{ color: "#664422" }}>Tap items above or scan barcode</p>
        ) : (
          <div className="space-y-1.5">
            {cart.items.map((item) => (
              <div key={item.cartId} className="flex items-center gap-2 p-1.5 rounded-lg"
                style={{ backgroundColor: "rgba(245,158,11,0.04)" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] truncate" style={{ color: "#f59e0b" }}>{item.name}</div>
                  <div className="text-[9px]" style={{ color: "#8a6830" }}>
                    {formatCurrency(item.unitPriceCents)} × {item.quantity} = {formatCurrency(item.totalPriceCents)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCart((p) => cartUpdateQuantity(p, item.cartId, item.quantity - 1))}
                    className="w-6 h-6 rounded text-[10px] flex items-center justify-center"
                    style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>−</button>
                  <span className="text-[10px] w-4 text-center" style={{ color: "#f59e0b" }}>{item.quantity}</span>
                  <button onClick={() => setCart((p) => cartUpdateQuantity(p, item.cartId, item.quantity + 1))}
                    className="w-6 h-6 rounded text-[10px] flex items-center justify-center"
                    style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>+</button>
                </div>
                <button onClick={() => setCart((p) => cartRemoveItem(p, item.cartId))}
                  className="text-[10px] ml-1" style={{ color: "#8a6830" }}>✕</button>
              </div>
            ))}
            <div className="border-t pt-2 mt-2" style={{ borderColor: "rgba(102,68,34,0.2)" }}>
              <div className="flex justify-between text-[10px]" style={{ color: "#8a6830" }}>
                <span>Subtotal</span><span>{formatCurrency(cart.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-[10px]" style={{ color: "#8a6830" }}>
                <span>Tax (4%)</span><span>{formatCurrency(cart.taxCents)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold mt-1" style={{ color: "#f59e0b" }}>
                <span>Total</span><span>{formatCurrency(cart.totalCents)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment + Checkout */}
      {cart.items.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-1">
            {([
              { pm: "cash" as PaymentMethod, label: "Cash" },
              { pm: "stripe_terminal" as PaymentMethod, label: "Card" },
              { pm: "manual" as PaymentMethod, label: "Manual" },
              { pm: "love_credits" as PaymentMethod, label: `LOVE (${formatCurrency(loveBalance)})` },
            ]).map(({ pm, label }) => (
              <button key={pm} onClick={() => setPaymentMethod(pm)}
                className="flex-1 py-1.5 text-[9px] uppercase rounded-md"
                style={{
                  backgroundColor: paymentMethod === pm ? "rgba(245,158,11,0.2)" : "transparent",
                  border: `1px solid ${paymentMethod === pm ? "rgba(245,158,11,0.4)" : "rgba(102,68,34,0.2)"}`,
                  color: paymentMethod === pm ? "#f59e0b" : "#664422",
                }}>
                {label}
              </button>
            ))}
          </div>

          {paymentMethod === "cash" && (
            <div className="flex gap-2 items-center">
              <span className="text-[10px]" style={{ color: "#8a6830" }}>Cash $</span>
              <input type="number" value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="0.00" min="0" step="0.01"
                className="flex-1 p-2 text-xs rounded-lg"
                style={{ backgroundColor: "rgba(10,5,5,0.6)", border: "1px solid rgba(102,68,34,0.3)", color: "#fcd34d" }}
              />
              {cashCalc && !cashCalc.shortfall && cashCalc.changeCents > 0 && (
                <span className="text-[10px]" style={{ color: "#86efac" }}>Change: {formatCurrency(cashCalc.changeCents)}</span>
              )}
            </div>
          )}

          {paymentMethod === "stripe_terminal" && (
            <div className="p-3 rounded-lg text-[10px] text-center space-y-2"
              style={{ border: "1px dashed rgba(102,68,34,0.3)", color: "#664422" }}>
              <div>Stripe Terminal SDK placeholder</div>
              <button className="px-4 py-1.5 rounded-md text-[9px] font-bold"
                style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                Connect Reader
              </button>
            </div>
          )}

          {paymentMethod === "love_credits" && loveBalance < cart.totalCents && (
            <p className="text-[10px]" style={{ color: "#ef4444" }}>
              Ins LOVE credits. Need {formatCurrency(cart.totalCents)}, have {formatCurrency(loveBalance)}.
            </p>
          )}

          {errorMsg && <p className="text-[10px]" style={{ color: "#ef4444" }}>{errorMsg}</p>}

          <button onClick={handleCheckout} disabled={status === "processing"}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{
              backgroundColor: status === "complete" ? "#059669" : "#f59e0b",
              color: status === "complete" ? "#f0fdf4" : "#1a0a00",
            }}>
            {status === "processing" ? "Recording..." : status === "complete" ? "\u2713 Recorded!" : `Checkout ${formatCurrency(cart.totalCents)}`}
          </button>
        </div>
      )}

      {/* Transaction history */}
      <button onClick={() => setShowHistory(!showHistory)} className="text-xs w-full text-left" style={{ color: "#f59e0b" }}>
        {showHistory ? "\u25BE Hide" : "\u25B8 Show"} History ({txHistory.length})
      </button>

      {showHistory && (
        <div className="space-y-1.5">
          {txHistory.length === 0 ? (
            <p className="text-[10px] text-center py-4" style={{ color: "#664422" }}>No transactions yet.</p>
          ) : txHistory.map((tx) => (
            <div key={tx.id} className="p-2 rounded-lg text-[10px]"
              style={{
                backgroundColor: tx.voided ? "rgba(239,68,68,0.05)" : "rgba(10,5,5,0.3)",
                border: `1px solid ${tx.voided ? "rgba(239,68,68,0.2)" : "rgba(102,68,34,0.15)"}`,
              }}>
              <div className="flex items-center justify-between">
                <span style={{ color: tx.voided ? "#fca5a5" : "#f59e0b" }}>
                  {tx.type} {tx.voided ? "(VOIDED)" : ""}
                </span>
                <span style={{ color: tx.type === "SALE" ? "#86efac" : tx.voided ? "#fca5a5" : "#f59e0b" }}>
                  {formatCurrency(tx.totalCents)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span style={{ color: "#664422" }}>
                  {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" · "}{tx.paymentMethod}
                  {!tx.synced && " · \u26A0 offline"}
                </span>
                {!tx.voided && tx.type === "SALE" && (
                  <button onClick={() => handleVoid(tx.id)} style={{ color: "#8a6830" }}>Void</button>
                )}
              </div>
              <div className="truncate mt-0.5" style={{ color: "#8a6830" }}>
                {tx.items.map((i) => `${i.name}×${i.quantity}`).join(", ")}
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSync} className="flex-1 py-2 text-[10px] rounded-lg"
              style={{ border: "1px solid rgba(102,68,34,0.3)", color: "#f59e0b" }}>
              Sync to Edge {syncStatus && `(${syncStatus})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VAULT TAB — Product catalog (read/write)
// ═══════════════════════════════════════════════════════════════

function VaultTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [filter, setFilter] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      const prods = await getProducts(false);
      setProducts(prods);
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleAddProduct = useCallback(async () => {
    if (!newSku.trim() || !newName.trim()) return;
    const price = toCents(parseFloat(newPrice) || 0);
    try {
      await upsertProduct({
        sku: newSku.trim(),
        name: newName.trim(),
        priceCents: price,
        category: newCategory.trim(),
      });
      setNewSku(""); setNewName(""); setNewPrice(""); setNewCategory("");
      setShowAdd(false);
      setEditingSku(null);
      await loadProducts();
    } catch { /* best-effort */ }
  }, [newSku, newName, newPrice, newCategory, loadProducts]);

  const handleEditProduct = useCallback(async (p: Product) => {
    setNewSku(p.sku); setNewName(p.name);
    setNewPrice((p.priceCents / 100).toFixed(2));
    setNewCategory(p.category || "");
    setEditingSku(p.sku);
    setShowAdd(true);
  }, []);

  const handleDeactivate = useCallback(async (sku: string) => {
    try {
      await deactivateProduct(sku);
      await loadProducts();
    } catch { /* best-effort */ }
  }, [loadProducts]);

  const filtered = filter.trim()
    ? products.filter((p) =>
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        p.sku.toLowerCase().includes(filter.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(filter.toLowerCase()))
      )
    : products;

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "#664422" }}>
        Product catalog. Items here can be sold through Katen POS with live price lookups.
      </p>

      <div className="flex gap-2">
        <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter products..."
          className="flex-1 p-2 text-xs rounded-lg"
          style={{ backgroundColor: "rgba(10,5,5,0.6)", border: "1px solid rgba(102,68,34,0.3)", color: "#fcd34d" }}
        />
        <button onClick={() => { setShowAdd(!showAdd); setEditingSku(null); setNewSku(""); setNewName(""); setNewPrice(""); setNewCategory(""); }}
          className="px-3 py-1.5 text-[10px] rounded-lg"
          style={{ border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}>
          {showAdd ? "Cancel" : "+ Add Product"}
        </button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-xl space-y-2" style={{ backgroundColor: "rgba(10,5,5,0.4)", border: "1px solid rgba(102,68,34,0.3)" }}>
          <input placeholder={editingSku ? "SKU (locked)" : "SKU (e.g. BREAD-SOUR)"} value={newSku}
            onChange={(e) => !editingSku && setNewSku(e.target.value)}
            disabled={!!editingSku}
            className="w-full p-2 text-xs rounded-lg disabled:opacity-50"
            style={{ backgroundColor: "rgba(10,5,5,0.6)", border: "1px solid rgba(102,68,34,0.3)", color: "#fcd34d" }} />
          <input placeholder="Product Name" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full p-2 text-xs rounded-lg"
            style={{ backgroundColor: "rgba(10,5,5,0.6)", border: "1px solid rgba(102,68,34,0.3)", color: "#fcd34d" }} />
          <div className="flex gap-2">
            <span className="text-[10px] self-center" style={{ color: "#8a6830" }}>$</span>
            <input placeholder="Price (e.g. 8.00)" value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="flex-1 p-2 text-xs rounded-lg"
              style={{ backgroundColor: "rgba(10,5,5,0.6)", border: "1px solid rgba(102,68,34,0.3)", color: "#fcd34d" }} />
            <input placeholder="Category" value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 p-2 text-xs rounded-lg"
              style={{ backgroundColor: "rgba(10,5,5,0.6)", border: "1px solid rgba(102,68,34,0.3)", color: "#fcd34d" }} />
            <button onClick={handleAddProduct} disabled={!newSku.trim() || !newName.trim()}
              className="px-4 py-2 text-[10px] rounded-lg font-bold disabled:opacity-50"
              style={{ backgroundColor: "#f59e0b", color: "#1a0a00" }}>
              {editingSku ? "Save" : "Add"}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="p-4 rounded-xl text-center" style={{ border: "1px dashed rgba(102,68,34,0.3)" }}>
          <p className="text-xs" style={{ color: "#664422" }}>No products in catalog. Add items above.</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {filtered.map((p) => (
            <div key={p.sku} className="flex items-center gap-2 p-2 rounded-lg"
              style={{
                backgroundColor: p.active ? "rgba(10,5,5,0.3)" : "rgba(10,5,5,0.15)",
                border: `1px solid ${p.active ? "rgba(102,68,34,0.15)" : "rgba(102,68,34,0.08)"}`,
              }}>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] truncate" style={{ color: p.active ? "#f59e0b" : "#8a6830" }}>{p.name}</div>
                <div className="text-[9px]" style={{ color: "#8a6830" }}>{p.sku}{p.category ? ` · ${p.category}` : ""}</div>
              </div>
              <span className="text-[10px]" style={{ color: "#f59e0b" }}>{formatCurrency(p.priceCents)}</span>
              <button onClick={() => handleEditProduct(p)} className="text-[9px] px-1.5" style={{ color: "#8a6830" }}>Edit</button>
              {p.active && (
                <button onClick={() => handleDeactivate(p.sku)} className="text-[9px] px-1.5" style={{ color: "#664422" }}>Deact</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WAREHOUSE TAB — Stock movement + scan logging
// ═══════════════════════════════════════════════════════════════

function WarehouseTab() {
  const [scanInput, setScanInput] = useState("");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanAction, setScanAction] = useState<"stock_in" | "stock_out" | "adjust">("stock_in");
  const [scanQty, setScanQty] = useState("1");
  const [scanLog, setScanLog] = useState<StockMovement[]>([]);
  const [stockLevels, setStockLevels] = useState<Array<{ sku: string; name: string; qty: number }>>([]);

  const loadData = useCallback(async () => {
    try {
      const movements = await getStockMovements(undefined, 20);
      setScanLog(movements);
      const levels = await getStockLevels();
      setStockLevels(levels.map((l) => ({ sku: l.sku, name: l.name, qty: l.quantity })));
    } catch { /* best-effort */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleScan = useCallback(async () => {
    const raw = scanInput.trim();
    if (!raw) return;
    const sku = raw.startsWith("/") ? raw.slice(1).trim() : raw.trim();
    const qty = Math.max(1, parseInt(scanQty, 10) || 1);
    const signedQty = scanAction === "stock_out" ? -qty : qty;

    try {
      await recordStockMovement({
        sku,
        quantity: signedQty,
        reason: scanAction,
      });
      setLastScan(sku);
      setScanInput("");
      await loadData();
    } catch { /* best-effort */ }
  }, [scanInput, scanAction, scanQty, loadData]);

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "#664422" }}>
        Stock movement. Scan barcodes to receive stock, record shipments, or adjust inventory.
      </p>

      {/* Scan input row */}
      <div className="flex gap-2">
        <input type="text" value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScan()}
          placeholder="/BARCODE or SKU"
          className="flex-1 p-3 text-xs rounded-lg font-mono"
          style={{ backgroundColor: "rgba(10,5,5,0.6)", border: "1px solid rgba(102,68,34,0.3)", color: "#fcd34d" }}
        />
        <input type="number" value={scanQty} min="1" step="1"
          onChange={(e) => setScanQty(e.target.value)}
          className="w-16 p-2 text-xs rounded-lg text-center"
          style={{ backgroundColor: "rgba(10,5,5,0.6)", border: "1px solid rgba(102,68,34,0.3)", color: "#fcd34d" }}
        />
        <button onClick={handleScan}
          className="px-4 py-2 text-[10px] rounded-lg font-bold"
          style={{ backgroundColor: "#f59e0b", color: "#1a0a00" }}>Scan</button>
      </div>

      {/* Action toggle */}
      <div className="flex gap-1">
        {([
          { a: "stock_in" as const, label: "Stock In" },
          { a: "stock_out" as const, label: "Stock Out" },
          { a: "adjust" as const, label: "Adjust" },
        ]).map(({ a, label }) => (
          <button key={a} onClick={() => setScanAction(a)}
            className="flex-1 py-1.5 text-[9px] uppercase rounded-md"
            style={{
              backgroundColor: scanAction === a ? "rgba(245,158,11,0.2)" : "transparent",
              border: `1px solid ${scanAction === a ? "rgba(245,158,11,0.4)" : "rgba(102,68,34,0.2)"}`,
              color: scanAction === a ? "#f59e0b" : "#664422",
            }}>
            {label}
          </button>
        ))}
      </div>

      {lastScan && (
        <div className="p-3 rounded-lg text-center" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="text-xs font-mono" style={{ color: "#f59e0b" }}>{lastScan}</div>
          <div className="text-[9px] mt-1" style={{ color: "#8a6830" }}>Last scanned · {scanAction} × {scanQty}</div>
        </div>
      )}

      {/* Stock levels summary */}
      {stockLevels.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#8a6830" }}>Stock Levels</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {stockLevels.filter((s) => s.qty !== 0).map((s) => (
              <div key={s.sku} className="flex items-center gap-2 p-1.5 rounded text-[10px]"
                style={{ backgroundColor: "rgba(10,5,5,0.3)", border: "1px solid rgba(102,68,34,0.1)" }}>
                <span className="font-mono flex-1 truncate" style={{ color: "#f59e0b" }}>{s.name}</span>
                <span className="font-mono" style={{ color: "#8a6830" }}>{s.sku}</span>
                <span className={`font-mono w-8 text-right ${s.qty < 0 ? "text-red-400" : "text-emerald-400"}`}>{s.qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scan log */}
      {scanLog.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#8a6830" }}>Recent Movements</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {scanLog.map((s) => (
              <div key={s.id} className="flex items-center gap-2 p-1.5 rounded text-[10px]"
                style={{ backgroundColor: "rgba(10,5,5,0.3)", border: "1px solid rgba(102,68,34,0.1)" }}>
                <span className="font-mono flex-1 truncate" style={{ color: "#f59e0b" }}>{s.sku}</span>
                <span className={s.quantity >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {s.quantity >= 0 ? "+" : ""}{s.quantity}
                </span>
                <span style={{ color: "#8a6830" }}>{s.reason}</span>
                <span style={{ color: "#664422" }}>
                  {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {!s.synced && <span style={{ color: "#f59e0b" }}>\u26A0</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ForgeSurface;
