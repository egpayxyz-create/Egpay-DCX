"use client";

import { useState } from "react";
import { ethers } from "ethers";

export default function ConvertPage() {
  const [amount, setAmount] = useState(1);
  const [quote, setQuote] = useState<any>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingConvert, setLoadingConvert] = useState(false);
  const [convertResult, setConvertResult] = useState<any>(null);

  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      alert("MetaMask not installed");
      return;
    }
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    setWallet(accounts[0]);
  };

  const getQuote = async () => {
    setLoadingQuote(true);
    setQuote(null);
    setConvertResult(null);

    const res = await fetch("/api/convert/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pair: "USDT_EGLIFE",
        side: "BUY",
        amountIn: amount,
      }),
    });

    const data = await res.json();
    setQuote(data);
    setLoadingQuote(false);
  };

  const convertNow = async () => {
    if (!wallet || !quote?.success) return;

    setLoadingConvert(true);
    setConvertResult(null);

    const res = await fetch("/api/convert/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pair: quote.pair,
        side: quote.side,
        amountIn: quote.amountIn,
        wallet,
      }),
    });

    const data = await res.json();
    setConvertResult(data);
    setLoadingConvert(false);
  };

  const canConvert = !!wallet && !!quote?.success && !loadingQuote && !loadingConvert;

  return (
    <div style={{ padding: 40 }}>
      <h1>EGPAYDCX Convert (Hybrid)</h1>

      {wallet ? (
        <p>
          <b>Connected:</b> {wallet.slice(0, 6)}…{wallet.slice(-4)}
        </p>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}

      <hr />

      <p><b>Pair:</b> USDT → EGLIFE</p>
      <p><b>Side:</b> BUY (+0.5% spread)</p>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        style={{ padding: 8 }}
        min={0}
      />

      <br /><br />

      <button onClick={getQuote} disabled={loadingQuote}>
        {loadingQuote ? "Loading..." : "Get Quote"}
      </button>

      {quote && (
        <div style={{ marginTop: 20 }}>
          {quote.success ? (
            <>
              <p><b>Rate:</b> {quote.rate}</p>
              <p><b>You Get:</b> {quote.amountOut} EGLIFE</p>

              <button
                style={{ marginTop: 10 }}
                onClick={convertNow}
                disabled={!canConvert}
              >
                {loadingConvert ? "Converting..." : "Convert Now"}
              </button>

              {!wallet && <p>⚠️ Connect wallet to continue</p>}
            </>
          ) : (
            <p style={{ color: "red" }}>Error: {quote.error}</p>
          )}
        </div>
      )}

      {convertResult && (
        <div style={{ marginTop: 20 }}>
          {convertResult.success ? (
            <p>✅ {convertResult.message} — Tx: {convertResult.txId}</p>
          ) : (
            <p style={{ color: "red" }}>❌ {convertResult.error}</p>
          )}
        </div>
      )}
    </div>
  );
}