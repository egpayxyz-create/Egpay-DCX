"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";

type Quote = {
  rate: number;
  amountOut: number;
  fee: number;
  total: number;
};

type Toast = { type: "success" | "error" | "info"; text: string };

function toNum(v: any, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function shortHash(h?: string) {
  if (!h) return "";
  if (h.length <= 16) return h;
  return `${h.slice(0, 8)}...${h.slice(-6)}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function isValidEvmAddress(addr: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
}

// Production-safe: UPI vs BANK reference validation
function isValidRefByMethod(method: "UPI_LINK" | "BANK", v: string) {
  const s = v.trim();
  if (!s) return false;
  if (method === "UPI_LINK") return /^[0-9]{10,18}$/.test(s); // UPI UTR mostly numeric
  return /^[A-Za-z0-9\-]{8,24}$/.test(s); // Bank reference may be alphanumeric
}

export default function BuyCryptoPage() {
  // --------- Config (locked merchant details) ---------
  const UPI_VPA = "7545978703@upi";
  const PAYEE_NAME = "Bhagwan Kumar";

  const BANK_ACCOUNT_NAME = "EGPAY TECH PRIVATE LIMITED";
  const BANK_ACCOUNT_NO = "44532283065";
  const BANK_IFSC = "SBIN0011805";
  const BANK_NAME = "STATE BANK OF INDIA";
  const BANK_BRANCH = "SABOUR";

  // --------- Form state ---------
  const [coin] = useState<"EGLIFE">("EGLIFE");

  const [payInr, setPayInr] = useState(1000);
  const [feeBps, setFeeBps] = useState(50);
  const [to, setTo] = useState("0xcBaCb12B25F93b4A8166BCc81Ae355a2Ea869350");

  const [payMethod, setPayMethod] = useState<"UPI_LINK" | "BANK">("UPI_LINK");
  const [quote, setQuote] = useState<Quote | null>(null);

  // UTR + order
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);

  const [orderId, setOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [polling, setPolling] = useState(false);
  const pollTimer = useRef<any>(null);

  // UX
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<any>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // Optional demo transfer toggle: /buy?demo=1
  const showDemoTransfer = useMemo(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("demo") === "1";
  }, []);

  // --------- Constraints (prod guardrails) ---------
  const minInr = 10;
  const maxInr = 500000; // adjust as needed
  const maxFeeBps = 500; // 5%

  const normalizedPayInr = Math.min(Math.max(payInr || 0, minInr), maxInr);
  const normalizedFeeBps = Math.min(Math.max(feeBps || 0, 0), maxFeeBps);

  const canQuote =
    normalizedPayInr >= minInr &&
    normalizedPayInr <= maxInr &&
    normalizedFeeBps >= 0 &&
    normalizedFeeBps <= maxFeeBps &&
    isValidEvmAddress(to);

  const canSubmit =
    !!quote &&
    isValidEvmAddress(to) &&
    normalizedPayInr >= minInr &&
    isValidRefByMethod(payMethod, utr) &&
    !loading;

  // --------- Quote ---------
  const getQuote = useCallback(() => {
    if (!isValidEvmAddress(to)) {
      return showToast({ type: "error", text: "Invalid payout address (0x...)" });
    }

    // demo rate (prod me server rate use karo)
    const rate = 1;
    const fee = Math.round((normalizedPayInr * normalizedFeeBps) / 10000);
    const total = normalizedPayInr + fee;

    // reset order state on new quote
    setOrderId("");
    setOrderStatus("");
    setTxHash("");
    setUtr(""); // IMPORTANT: clear old UTR after new quote

    setQuote({ rate, amountOut: normalizedPayInr, fee, total });
    showToast({ type: "success", text: "Quote generated" });
  }, [normalizedPayInr, normalizedFeeBps, to, showToast]);

  // --------- Polling ---------
  const stopPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = null;
    setPolling(false);
  }, []);

  async function fetchStatus(oid: string) {
    const r = await fetch(`/api/orders/status?orderId=${encodeURIComponent(oid)}`, {
      cache: "no-store",
    });
    const j = await r.json().catch(() => ({}));

    if (!r.ok || !j.ok) throw new Error(j?.error || "Status fetch failed");

    if (j.found === false) {
      setOrderStatus("NOT_FOUND");
      return "NOT_FOUND";
    }

    const st = String(j.status || j.order?.status || "");
    setOrderStatus(st);

    if (j.order?.txHash) setTxHash(String(j.order.txHash));
    return st;
  }

  const startPolling = useCallback(
    (oid: string) => {
      if (!oid) return;
      stopPolling();
      setPolling(true);

      // one-time fetch (optional info toast)
      fetchStatus(oid).catch(() => {
        // do not spam toast in production polling
      });

      pollTimer.current = setInterval(async () => {
        try {
          const st = await fetchStatus(oid);
          if (st === "APPROVED" || st === "REJECTED" || st === "FAILED") stopPolling();
        } catch {
          // silent retry (avoid toast spam)
        }
      }, 5000);
    },
    [stopPolling],
  );

  useEffect(() => {
    return () => {
      stopPolling();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [stopPolling]);

  // --------- UPI deep link ---------
  function openUpiPayLink(amount: number, note: string) {
    const pa = encodeURIComponent(UPI_VPA.trim());
    const pn = encodeURIComponent(PAYEE_NAME.trim() || "Payee");
    const am = encodeURIComponent(String(amount));
    const tn = encodeURIComponent(note);
    const url = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // --------- Submit UTR (Create Order) ---------
  async function submitOrder() {
    if (!quote) return showToast({ type: "error", text: "Get Quote first" });
    if (!isValidEvmAddress(to)) return showToast({ type: "error", text: "Invalid payout address" });

    if (!isValidRefByMethod(payMethod, utr)) {
      return showToast({
        type: "error",
        text: payMethod === "UPI_LINK" ? "Invalid UTR (10–18 digits)" : "Invalid Bank Ref (8–24, A-Z/0-9/-)",
      });
    }

    setLoading(true);
    try {
      const r = await fetch("/api/upi/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          utr: utr.trim(),
          amountInr: quote.total, // server MUST validate
          toAddress: to.trim(),
          payInr: normalizedPayInr,
          feeBps: normalizedFeeBps,
          amountOut: quote.amountOut, // server MUST ignore/validate
          coin,
          payMethod,
        }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j?.message || j?.error || "Create order failed");

      // Production rule: orderId MUST come from server
      const oid = String(j.orderId || "");
      if (!oid) throw new Error("Server did not return orderId");

      setOrderId(oid);
      setOrderStatus(String(j.status || "PENDING_CONFIRMATION"));

      showToast({ type: "success", text: "Order created. Waiting for admin confirmation." });
      startPolling(oid);
    } catch (e: any) {
      showToast({ type: "error", text: e?.message || "Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  // --------- Demo transfer (hidden unless ?demo=1) ---------
  async function demoTransfer() {
    if (!quote) return showToast({ type: "error", text: "Get Quote first" });

    setLoading(true);
    try {
      const execPayload = {
        token: "0xca326a5e15b9451efC1A6BddaD6fB098a4D09113",
        coin: "EGLIFE",
        to,
        payInr: normalizedPayInr,
        feeBps: normalizedFeeBps,
        amountOut: quote.amountOut,
      };

      const exec = await fetch("/api/convert/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(execPayload),
      });

      const ej = await exec.json().catch(() => ({}));
      if (!exec.ok || !ej.ok) throw new Error(ej?.error || "Token transfer failed");

      showToast({ type: "success", text: `Demo Transfer Done: ${shortHash(ej.txHash)}` });
    } catch (e: any) {
      showToast({ type: "error", text: e?.message || "Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  const statusColor =
    orderStatus === "APPROVED"
      ? "#22c55e"
      : orderStatus === "REJECTED" || orderStatus === "FAILED"
        ? "#ef4444"
        : "#f59e0b";

  const isFinal = orderStatus === "APPROVED" || orderStatus === "REJECTED" || orderStatus === "FAILED";
  const step = !quote ? 1 : !orderId ? 2 : isFinal ? 4 : 3;

  const utrPlaceholder = payMethod === "UPI_LINK" ? "10–18 digits UTR" : "Bank Ref/UTR (8–24, A-Z/0-9/-)";

  return (
    <div style={styles.shell}>
      {/* Toast */}
      {toast ? (
        <div style={styles.toast(toast.type)}>
          <div style={{ fontWeight: 900 }}>{toast.text}</div>
        </div>
      ) : null}

      {/* Top bar */}
      <div style={styles.topbar}>
        <div style={styles.brand}>
          <div style={styles.logo} />
          <div>
            <div style={styles.brandTitle}>EgpayDCX</div>
            <div style={styles.brandSub}>Buy EGLIFE • INR → Token</div>
          </div>
        </div>

        <div style={styles.topActions}>
          <div style={styles.badge}>Buy</div>
          <div style={styles.miniWallet}>
            <span style={{ opacity: 0.7 }}>To:</span> {shortHash(to)}
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div style={styles.stepperWrap}>
        <div style={styles.stepper}>
          {[
            ["1", "Quote"],
            ["2", "Pay"],
            ["3", "Submit UTR"],
            ["4", "Track"],
          ].map(([n, label]) => {
            const active =
              (n === "1" && step >= 1) ||
              (n === "2" && step >= 2) ||
              (n === "3" && step >= 3) ||
              (n === "4" && (orderStatus === "APPROVED" || orderStatus === "REJECTED" || orderStatus === "FAILED"));
            return (
              <div key={n} style={styles.stepItem(active)}>
                <div style={styles.stepDot(active)}>{n}</div>
                <div style={styles.stepLabel(active)}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Layout */}
      <div style={styles.grid}>
        {/* Left panel */}
        <div style={styles.left}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Buy Crypto</div>
            <div style={styles.cardSub}>Enter amount, payout address, then generate quote.</div>

            <div style={styles.hr} />

            {/* Coin + Amount */}
            <div style={styles.row2}>
              <div>
                <div style={styles.label}>Coin</div>
                <div style={styles.selectFake}>EGLIFE — EGLIFE Token</div>
              </div>
              <div>
                <div style={styles.label}>Pay Amount (INR)</div>
                <input
                  style={styles.input}
                  type="number"
                  value={payInr}
                  min={minInr}
                  max={maxInr}
                  onChange={(e) => setPayInr(toNum(e.target.value, minInr))}
                />
                <div style={styles.hint}>
                  Min ₹{minInr} • Max ₹{maxInr.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div style={styles.row2}>
              <div>
                <div style={styles.label}>Admin Fee (bps)</div>
                <input
                  style={styles.input}
                  type="number"
                  value={feeBps}
                  min={0}
                  max={maxFeeBps}
                  onChange={(e) => setFeeBps(toNum(e.target.value, 0))}
                />
                <div style={styles.hint}>100 bps = 1% • Max {maxFeeBps} bps</div>
              </div>
              <div>
                <div style={styles.label}>Payout Address (To)</div>
                <input style={styles.input} value={to} onChange={(e) => setTo(e.target.value)} />
                {!to ? null : isValidEvmAddress(to) ? (
                  <div style={{ ...styles.hint, color: "#22c55e" }}>✓ Address looks valid</div>
                ) : (
                  <div style={{ ...styles.hint, color: "#ef4444" }}>✗ Invalid EVM address</div>
                )}
              </div>
            </div>

            <button style={styles.primaryBtn(loading || !canQuote)} onClick={getQuote} disabled={loading || !canQuote}>
              {loading ? "Please wait..." : "Get Quote"}
            </button>

            {/* Quote */}
            {quote ? (
              <div style={styles.quoteBox}>
                <div style={styles.quoteTitle}>Quote</div>
                <div style={styles.quoteGrid}>
                  <div style={styles.kv}>
                    <div style={styles.k}>Rate</div>
                    <div style={styles.v}>{quote.rate}</div>
                  </div>
                  <div style={styles.kv}>
                    <div style={styles.k}>You receive</div>
                    <div style={styles.v}>{quote.amountOut}</div>
                  </div>
                  <div style={styles.kv}>
                    <div style={styles.k}>Fee</div>
                    <div style={styles.v}>₹{quote.fee}</div>
                  </div>
                  <div style={styles.kv}>
                    <div style={styles.k}>Total Pay</div>
                    <div style={styles.v}>₹{quote.total}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.emptyState}>Generate quote to continue.</div>
            )}
          </div>

          {/* Payment card */}
          {quote ? (
            <div style={styles.card}>
              <div style={styles.cardTitle}>Payment</div>
              <div style={styles.cardSub}>Pay using UPI/Bank, then submit reference.</div>

              <div style={styles.payTabs}>
                <button type="button" onClick={() => setPayMethod("UPI_LINK")} style={styles.tabBtn(payMethod === "UPI_LINK")}>
                  UPI (Pay Link)
                </button>
                <button type="button" onClick={() => setPayMethod("BANK")} style={styles.tabBtn(payMethod === "BANK")}>
                  Bank Transfer
                </button>
              </div>

              {payMethod === "UPI_LINK" ? (
                <div style={{ marginTop: 12 }}>
                  <div style={styles.infoRow}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.label}>UPI VPA</div>
                      <div style={styles.infoValue}>{UPI_VPA}</div>
                    </div>
                    <button
                      style={styles.ghostBtn}
                      onClick={async () =>
                        showToast((await copyText(UPI_VPA)) ? { type: "success", text: "UPI VPA copied" } : { type: "error", text: "Copy failed" })
                      }
                    >
                      Copy
                    </button>
                  </div>

                  <div style={styles.infoRow}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.label}>Payee Name</div>
                      <div style={styles.infoValue}>{PAYEE_NAME}</div>
                    </div>
                    <button
                      style={styles.ghostBtn}
                      onClick={async () =>
                        showToast((await copyText(PAYEE_NAME)) ? { type: "success", text: "Payee name copied" } : { type: "error", text: "Copy failed" })
                      }
                    >
                      Copy
                    </button>
                  </div>

                  <button
                    type="button"
                    style={styles.primaryBtn(loading)}
                    onClick={() => openUpiPayLink(quote.total, `Buy ${quote.amountOut} EGLIFE | To:${to.slice(0, 6)}...`)}
                    disabled={loading}
                  >
                    Pay Now via UPI (₹{quote.total})
                  </button>

                  <div style={styles.hint}>UPI app open hoga. Payment ke baad UTR yaha submit karein.</div>
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div style={styles.bankBox}>
                    {[
                      ["Account Name", BANK_ACCOUNT_NAME],
                      ["Account No", BANK_ACCOUNT_NO],
                      ["IFSC", BANK_IFSC],
                      ["Bank", BANK_NAME],
                      ["Branch", BANK_BRANCH],
                    ].map(([k, v]) => (
                      <div key={k} style={styles.bankRow}>
                        <div style={styles.bankKey}>{k}</div>
                        <div style={styles.bankVal}>{v}</div>
                        <button
                          style={styles.ghostBtn}
                          onClick={async () =>
                            showToast((await copyText(String(v))) ? { type: "success", text: `${k} copied` } : { type: "error", text: "Copy failed" })
                          }
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                    <div style={styles.hint}>Transfer ke baad bank reference/UTR submit karein.</div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                <div style={styles.label}>{payMethod === "UPI_LINK" ? "UTR / Transaction ID" : "Bank Reference / UTR"}</div>
                <input style={styles.input} value={utr} onChange={(e) => setUtr(e.target.value)} placeholder={utrPlaceholder} />

                {!utr ? null : isValidRefByMethod(payMethod, utr) ? (
                  <div style={{ ...styles.hint, color: "#22c55e" }}>✓ Reference looks valid</div>
                ) : (
                  <div style={{ ...styles.hint, color: "#ef4444" }}>✗ Invalid reference</div>
                )}
              </div>

              <button style={styles.primaryBtn(!canSubmit)} onClick={submitOrder} disabled={!canSubmit}>
                {loading ? "Submitting..." : "I have paid (Create Order)"}
              </button>

              {showDemoTransfer ? (
                <button style={styles.dangerBtn(loading)} onClick={demoTransfer} disabled={loading}>
                  {loading ? "Processing..." : "Buy Now (Demo Transfer Only)"}
                </button>
              ) : null}

              <div style={{ marginTop: 12, ...styles.hint }}>
                Note: Order create hone ke baad admin verify karega, phir token transfer.
              </div>
            </div>
          ) : null}
        </div>

        {/* Right panel */}
        <div style={styles.right}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Order Tracking</div>
            <div style={styles.cardSub}>Auto refresh after order create.</div>

            <div style={styles.hr} />

            <div style={styles.trackRow}>
              <div style={styles.trackKey}>OrderId</div>
              <div style={styles.trackVal}>{orderId || "—"}</div>
            </div>

            <div style={styles.trackRow}>
              <div style={styles.trackKey}>Status</div>
              <div style={{ ...styles.trackVal, color: orderStatus ? statusColor : "#94a3b8" }}>
                {orderStatus || "—"}
                {polling ? <span style={{ color: "#94a3b8" }}> (checking…)</span> : null}
              </div>
            </div>

            <div style={styles.trackRow}>
              <div style={styles.trackKey}>Tx</div>
              <div style={styles.trackVal}>{txHash ? shortHash(txHash) : "—"}</div>
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button style={styles.ghostBtnWide(!orderId)} disabled={!orderId} onClick={() => startPolling(orderId)}>
                Refresh
              </button>
              <button style={styles.ghostBtnWide(!polling)} disabled={!polling} onClick={stopPolling}>
                Stop
              </button>
            </div>

            <div style={{ marginTop: 14, ...styles.hint }}>✅ Rule: Payment confirm hone ke baad hi token transfer hoga.</div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Security Notes</div>
            <div style={styles.cardSub}>Live ke pehle Orders DB + idempotent approve must.</div>
            <div style={styles.hr} />
            <ul style={styles.ul}>
              <li>UTR unique + server-side check</li>
              <li>Approve idempotent</li>
              <li>Admin auth (role-based)</li>
              <li>Rate limit basic</li>
              <li>Audit logs (who approved)</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={styles.footer}>© EgpayDCX • Secure Buy Flow</div>
    </div>
  );
}

const styles: Record<string, any> = {
  // --- styles unchanged (your original styles) ---
  shell: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 500px at 20% 0%, rgba(59,130,246,0.25), transparent 60%), #0b1020",
    color: "#e5e7eb",
    padding: 18,
  },
  toast: (type: Toast["type"]) => ({
    position: "fixed",
    top: 16,
    right: 16,
    zIndex: 9999,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.18)",
    background:
      type === "success"
        ? "rgba(34,197,94,0.15)"
        : type === "error"
          ? "rgba(239,68,68,0.15)"
          : "rgba(59,130,246,0.15)",
    color: "#e5e7eb",
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
    maxWidth: 360,
  }),
  topbar: {
    maxWidth: 1180,
    margin: "0 auto 14px auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.6)",
    backdropFilter: "blur(10px)",
  },
  brand: { display: "flex", gap: 12, alignItems: "center" },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: "linear-gradient(135deg, rgba(37,99,235,1), rgba(16,185,129,1))",
    boxShadow: "0 10px 30px rgba(37,99,235,0.25)",
  },
  brandTitle: { fontWeight: 900, fontSize: 16, letterSpacing: 0.3 },
  brandSub: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  topActions: { display: "flex", gap: 10, alignItems: "center" },
  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(59,130,246,0.35)",
    background: "rgba(59,130,246,0.12)",
  },
  miniWallet: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.6)",
    color: "#e5e7eb",
  },
  stepperWrap: { maxWidth: 1180, margin: "0 auto 14px auto" },
  stepper: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.45)",
    backdropFilter: "blur(10px)",
  },
  stepItem: (active: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 10px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.14)",
    background: active ? "rgba(37,99,235,0.18)" : "rgba(15,23,42,0.35)",
  }),
  stepDot: (active: boolean) => ({
    width: 26,
    height: 26,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    border: "1px solid rgba(148,163,184,0.18)",
    background: active ? "rgba(37,99,235,0.35)" : "rgba(2,6,23,0.35)",
    color: active ? "#bfdbfe" : "#94a3b8",
  }),
  stepLabel: (active: boolean) => ({
    fontSize: 12,
    fontWeight: 900,
    color: active ? "#e5e7eb" : "#94a3b8",
  }),
  grid: {
    maxWidth: 1180,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.65fr 1fr",
    gap: 14,
  },
  left: { display: "flex", flexDirection: "column", gap: 14 },
  right: { display: "flex", flexDirection: "column", gap: 14 },
  card: {
    background: "rgba(2,6,23,0.6)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  },
  cardTitle: { fontSize: 16, fontWeight: 900 },
  cardSub: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  hr: { height: 1, background: "rgba(148,163,184,0.14)", margin: "14px 0" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label: { fontSize: 12, color: "#cbd5e1", fontWeight: 800 },
  hint: { fontSize: 12, color: "#94a3b8", marginTop: 6 },
  input: {
    width: "100%",
    marginTop: 8,
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.75)",
    color: "#e5e7eb",
    outline: "none",
  },
  selectFake: {
    marginTop: 8,
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.75)",
    color: "#e5e7eb",
    fontWeight: 800,
  },
  primaryBtn: (disabled: boolean) => ({
    width: "100%",
    marginTop: 14,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(59,130,246,0.45)",
    background: disabled
      ? "rgba(37,99,235,0.25)"
      : "linear-gradient(135deg, rgba(37,99,235,1), rgba(29,78,216,1))",
    color: "white",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.85 : 1,
  }),
  dangerBtn: (disabled: boolean) => ({
    width: "100%",
    marginTop: 10,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(239,68,68,0.35)",
    background: disabled ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.12)",
    color: "#fecaca",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
  }),
  quoteBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.45)",
  },
  quoteTitle: { fontWeight: 900, marginBottom: 10 },
  quoteGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  kv: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(2,6,23,0.35)",
  },
  k: { fontSize: 11, color: "#94a3b8", fontWeight: 800 },
  v: { fontSize: 14, fontWeight: 900, marginTop: 4 },
  emptyState: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    border: "1px dashed rgba(148,163,184,0.22)",
    color: "#94a3b8",
    fontSize: 12,
  },
  payTabs: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 },
  tabBtn: (active: boolean) => ({
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.18)",
    background: active ? "rgba(37,99,235,0.22)" : "rgba(15,23,42,0.65)",
    color: active ? "#bfdbfe" : "#e5e7eb",
    fontWeight: 900,
    cursor: "pointer",
  }),
  infoRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.55)",
    marginTop: 10,
  },
  infoValue: { fontWeight: 900, marginTop: 6, wordBreak: "break-all" },
  bankBox: {
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.55)",
    padding: 12,
  },
  bankRow: {
    display: "grid",
    gridTemplateColumns: "140px 1fr 80px",
    gap: 10,
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid rgba(148,163,184,0.12)",
  },
  bankKey: { color: "#94a3b8", fontSize: 12, fontWeight: 800 },
  bankVal: { fontWeight: 900, wordBreak: "break-word" },
  ghostBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.35)",
    color: "#e5e7eb",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  ghostBtnWide: (disabled: boolean) => ({
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.18)",
    background: disabled ? "rgba(2,6,23,0.2)" : "rgba(2,6,23,0.35)",
    color: disabled ? "#64748b" : "#e5e7eb",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
  }),
  trackRow: { display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10 },
  trackKey: { color: "#94a3b8", fontSize: 12, fontWeight: 800 },
  trackVal: { fontSize: 12, fontWeight: 900, textAlign: "right", wordBreak: "break-word" },
  ul: { margin: "10px 0 0 18px", color: "#cbd5e1", fontSize: 12, lineHeight: 1.6 },
  footer: {
    maxWidth: 1180,
    margin: "14px auto 0 auto",
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    opacity: 0.85,
  },
};
