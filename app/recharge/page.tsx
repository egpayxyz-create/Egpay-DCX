"use client";

import { useEffect, useMemo, useState } from "react";

type Service = "MOBILE_PREPAID" | "POSTPAID" | "DTH" | "ELECTRICITY";
type Operator = { code: string; name: string };

const OPERATORS: Record<Service, Operator[]> = {
  MOBILE_PREPAID: [
    { code: "AT", name: "Airtel" },
    { code: "JF", name: "Jio" },
    { code: "VI", name: "Vi" },
    { code: "BS", name: "BSNL" },
  ],
  POSTPAID: [
    { code: "AT_PP", name: "Airtel Postpaid" },
    { code: "JF_PP", name: "Jio Postpaid" },
    { code: "VI_PP", name: "Vi Postpaid" },
    { code: "BS_PP", name: "BSNL Postpaid" },
  ],
  DTH: [
    { code: "TS", name: "Tata Play" },
    { code: "DT", name: "Dish TV" },
    { code: "AT_DTH", name: "Airtel Digital TV" },
    { code: "SN", name: "Sun Direct" },
  ],
  ELECTRICITY: [
    { code: "BSEB", name: "Bihar (NBPDCL/SBPDCL)" },
    { code: "UPPCL", name: "UPPCL" },
    { code: "DVB", name: "Delhi Discom" },
  ],
};

type UiOrder = {
  id: string;
  createdAt: number;
  service: Service;
  operator: string;
  account: string;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
};

function onlyDigits(v: string) {
  return String(v).replace(/[^\d]/g, "");
}
function toInt(v: string) {
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function shortId(id: string) {
  if (id.length <= 14) return id;
  return `${id.slice(0, 7)}...${id.slice(-5)}`;
}

export default function RechargePage() {
  const [service, setService] = useState<Service>("MOBILE_PREPAID");
  const [operator, setOperator] = useState<string>(OPERATORS.MOBILE_PREPAID[0]?.code ?? "");
  const [account, setAccount] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  // UI-only "recent orders"
  const [orders, setOrders] = useState<UiOrder[]>([]);

  const operatorOptions = useMemo(() => OPERATORS[service] ?? [], [service]);

  useEffect(() => {
    // service change पर operator auto-set
    setOperator(OPERATORS[service]?.[0]?.code ?? "");
  }, [service]);

  const amountNum = useMemo(() => toInt(amount), [amount]);

  const accountLabel = useMemo(() => {
    if (service === "DTH") return "DTH / VC Number";
    if (service === "ELECTRICITY") return "Consumer / Account Number";
    return "Mobile Number";
  }, [service]);

  const accountPlaceholder = useMemo(() => {
    if (service === "ELECTRICITY") return "Enter consumer number";
    if (service === "DTH") return "Enter VC / Subscriber ID";
    return "Enter 10-digit mobile number";
  }, [service]);

  const isAccountValid = useMemo(() => {
    const a = onlyDigits(account);
    if (service === "MOBILE_PREPAID" || service === "POSTPAID") return a.length === 10;
    if (service === "DTH") return a.length >= 8; // loose
    if (service === "ELECTRICITY") return a.length >= 6; // loose
    return a.length > 0;
  }, [account, service]);

  const isAmountValid = amountNum >= 10 && amountNum <= 10000; // UI guard
  const canSubmit = isAccountValid && isAmountValid && Boolean(operator) && status !== "loading";

  function onServiceChange(next: Service) {
    setService(next);
    setAccount("");
    setAmount("");
    setCustomerName("");
    setStatus("idle");
    setMessage("");
  }

  function setQuickAmount(v: number) {
    setAmount(String(v));
    setStatus("idle");
    setMessage("");
  }

  async function handleRecharge() {
    setStatus("loading");
    setMessage("Creating recharge order...");

    try {
      // Phase-1 (UI only): simulate network
      await new Promise((r) => setTimeout(r, 700));

      // Fake outcome
      const ok = Math.random() > 0.12; // 88% success simulation
      const orderId = `RC_${Date.now()}`;

      const newOrder: UiOrder = {
        id: orderId,
        createdAt: Date.now(),
        service,
        operator,
        account: onlyDigits(account) || account,
        amount: amountNum,
        status: ok ? "SUCCESS" : "FAILED",
      };

      setOrders((prev) => [newOrder, ...prev].slice(0, 8));

      if (ok) {
        setStatus("success");
        setMessage(`Recharge submitted ✅ Order: ${orderId}`);
      } else {
        setStatus("error");
        setMessage(`Recharge failed ❌ Order: ${orderId} (try again)`);
      }
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message || "Recharge failed. Try again.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-50">
      {/* Top Bar */}
      <div className="border-b border-gray-900 bg-gray-950/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Recharge</div>
            <div className="text-xs text-gray-400">Paysprint UI (Phase-1) — API integration next</div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:inline">Mode:</span>
            <span className="text-xs rounded-full border border-gray-800 bg-gray-900/40 px-3 py-1">
              UI Only
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* FORM */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900/30 p-5 shadow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">New Recharge</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Service select karke operator, number aur amount fill karein.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAccount("");
                  setAmount("");
                  setCustomerName("");
                  setMessage("");
                  setStatus("idle");
                }}
                className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-xs hover:bg-gray-900"
              >
                Clear
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Service */}
              <Field label="Service">
                <select
                  className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 outline-none"
                  value={service}
                  onChange={(e) => onServiceChange(e.target.value as Service)}
                >
                  <option value="MOBILE_PREPAID">Mobile Prepaid</option>
                  <option value="POSTPAID">Mobile Postpaid</option>
                  <option value="DTH">DTH</option>
                  <option value="ELECTRICITY">Electricity</option>
                </select>
              </Field>

              {/* Operator */}
              <Field label="Operator">
                <select
                  className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 outline-none"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                >
                  {operatorOptions.map((op) => (
                    <option key={op.code} value={op.code}>
                      {op.name}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Account */}
              <Field label={accountLabel} hint={service === "MOBILE_PREPAID" || service === "POSTPAID" ? "10 digit" : undefined}>
                <input
                  className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 outline-none"
                  placeholder={accountPlaceholder}
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  inputMode="numeric"
                />
                {!isAccountValid && account.length > 0 && (
                  <p className="mt-1 text-xs text-rose-400">Please enter a valid {accountLabel}.</p>
                )}
              </Field>

              {/* Amount */}
              <Field label="Amount (₹)" hint="Min ₹10, Max ₹10,000">
                <input
                  className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 outline-none"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                />
                {!isAmountValid && amount.length > 0 && (
                  <p className="mt-1 text-xs text-rose-400">Amount must be between ₹10 and ₹10,000.</p>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  {[99, 149, 199, 239, 299, 349, 399].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setQuickAmount(v)}
                      className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-1.5 text-xs hover:bg-gray-900"
                    >
                      ₹{v}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Optional name */}
              <Field label="Customer Name (optional)" className="md:col-span-2">
                <input
                  className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 outline-none"
                  placeholder="Name (receipt/future use)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </Field>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm hover:bg-gray-900"
                onClick={() => {
                  setMessage("Plans feature Phase-2 (operator plan API) me aayega.");
                  setStatus("idle");
                }}
                type="button"
              >
                Browse Plans (Phase-2)
              </button>

              <button
                className={`rounded-xl px-5 py-3 text-sm font-semibold ${
                  canSubmit
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-gray-800 text-gray-400 cursor-not-allowed"
                }`}
                onClick={handleRecharge}
                disabled={!canSubmit}
                type="button"
              >
                {status === "loading" ? "Processing..." : "Recharge Now"}
              </button>
            </div>

            {/* Status box */}
            {message && (
              <div
                className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                  status === "success"
                    ? "border-emerald-700 bg-emerald-900/20 text-emerald-200"
                    : status === "error"
                    ? "border-rose-700 bg-rose-900/20 text-rose-200"
                    : "border-gray-800 bg-gray-950 text-gray-200"
                }`}
              >
                {message}
              </div>
            )}

            {/* Recent Orders */}
            <div className="mt-7">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-200">Recent Orders (UI)</h3>
                <span className="text-xs text-gray-500">last {orders.length} shown</span>
              </div>

              <div className="mt-3 space-y-2">
                {orders.length === 0 ? (
                  <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 text-sm text-gray-400">
                    No orders yet. First recharge try karein.
                  </div>
                ) : (
                  orders.map((o) => (
                    <div
                      key={o.id}
                      className="rounded-xl border border-gray-800 bg-gray-950 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">
                          {labelOfService(o.service)} • {operatorName(o.service, o.operator)}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {accountLabelOf(o.service)}: {o.account} • Order: {shortId(o.id)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 justify-between sm:justify-end">
                        <div className="text-sm font-semibold">₹{o.amount}</div>
                        <StatusPill s={o.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Phase-2 me yahi orders DB (PostgreSQL/Firestore) se aayenge + status polling.
              </div>
            </div>
          </div>

          {/* SUMMARY */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-5 shadow">
            <h2 className="text-lg font-semibold">Order Summary</h2>

            <div className="mt-4 space-y-3 text-sm">
              <Row label="Service" value={labelOfService(service)} />
              <Row label="Operator" value={operatorName(service, operator)} />
              <Row label={accountLabel} value={account || "-"} />
              <Row label="Amount" value={amountNum ? `₹ ${amountNum}` : "-"} />

              <div className="pt-3 border-t border-gray-800" />
              <Row label="Convenience Fee" value="₹ 0 (Phase-1)" />
              <Row label="Total" value={amountNum ? `₹ ${amountNum}` : "-"} bold />
            </div>

            <div className="mt-6 rounded-xl border border-gray-800 bg-gray-950 p-4 text-xs text-gray-300">
              <p className="font-semibold text-gray-200">Next (Phase-2):</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>/api/recharge/create (DB order)</li>
                <li>Paysprint recharge API call</li>
                <li>Txn status check/poll + webhook</li>
                <li>Recharge History + Filters</li>
                <li>Admin approvals (agar aap chahein)</li>
              </ul>
            </div>

            <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950 p-4 text-xs text-gray-400">
              Security tip: Paysprint keys/secret hamesha <span className="text-gray-200">server routes</span> me rakhen,
              UI me kabhi expose na karein.
            </div>
          </div>
        </div>

        <p className="mt-8 text-xs text-gray-500">
          Note: Ye page UI-only hai. Phase-2 me hum API routes add karke real recharge trigger karenge.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-300">{label}</label>
        {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-400">{label}</span>
      <span className={`${bold ? "font-semibold" : ""} text-gray-100 text-right`}>{value}</span>
    </div>
  );
}

function StatusPill({ s }: { s: UiOrder["status"] }) {
  const cls =
    s === "SUCCESS"
      ? "border-emerald-700 bg-emerald-900/20 text-emerald-200"
      : s === "FAILED"
      ? "border-rose-700 bg-rose-900/20 text-rose-200"
      : "border-yellow-700 bg-yellow-900/20 text-yellow-200";
  return <span className={`text-xs rounded-full border px-3 py-1 ${cls}`}>{s}</span>;
}

function labelOfService(s: Service) {
  if (s === "MOBILE_PREPAID") return "Mobile Prepaid";
  if (s === "POSTPAID") return "Mobile Postpaid";
  if (s === "DTH") return "DTH";
  if (s === "ELECTRICITY") return "Electricity";
  return s;
}

function accountLabelOf(s: Service) {
  if (s === "DTH") return "VC";
  if (s === "ELECTRICITY") return "Consumer";
  return "Mobile";
}

function operatorName(service: Service, code: string) {
  const list = OPERATORS[service] ?? [];
  return list.find((x) => x.code === code)?.name ?? code ?? "-";
}
