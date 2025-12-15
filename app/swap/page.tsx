"use client";

import { useEffect, useState } from "react";
import {
  BrowserProvider,
  Contract,
  formatUnits,
  parseUnits,
} from "ethers";
import {
  BSC_CHAIN_ID,
  TOKENS,
  TokenKey,
  ERC20_ABI,
  PANCAKE_ROUTER_ABI,
  PANCAKE_ROUTER_V2,
} from "../../lib/swapConfig";

type StatusType = "idle" | "loading" | "success" | "error";

// TypeScript ke liye window
declare global {
  interface Window {
    ethereum?: any;
    BinanceChain?: any; // Binance Web3 wallet ke liye fallback
  }
}

/**
 * ✅ BSC network auto add / auto switch helper
 */
async function addOrSwitchBSC(injected: any): Promise<boolean> {
  try {
    // Pehle try karein switch karne ka
    await injected.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x38" }], // 56 in hex
    });
    return true;
  } catch (switchError: any) {
    // Agar chain add nahi hai
    if (switchError.code === 4902) {
      try {
        await injected.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x38",
              chainName: "BNB Smart Chain",
              nativeCurrency: {
                name: "BNB",
                symbol: "BNB",
                decimals: 18,
              },
              rpcUrls: ["https://bsc-dataseed.binance.org/"],
              blockExplorerUrls: ["https://bscscan.com"],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add BSC network:", addError);
        return false;
      }
    }
    console.error("wallet_switchEthereumChain error:", switchError);
    return false;
  }
}

/**
 * ✅ Token path helper
 *
 * Assumptions (aapke transaction logs ke hisaab se):
 * - EGLIFE <-> USDT (BSC-USD) direct Pancake V2 pool hai
 * - WBNB <-> USDT pool hai
 *
 * Routes:
 * - BNB <-> EGLIFE  : WBNB -> USDT -> EGLIFE
 * - BNB <-> USDT    : WBNB -> USDT
 * - USDT <-> EGLIFE : direct [USDT, EGLIFE]
 */
function buildPath(from: TokenKey, to: TokenKey): string[] {
  const addr = (t: TokenKey): string => {
    if (t === "BNB") {
      // BNB ko WBNB se map kar rahe hain
      return TOKENS.WBNB.address as string;
    }
    return TOKENS[t].address as string;
  };

  // Same token
  if (from === to) {
    return [addr(from)];
  }

  // 1️⃣ BNB <-> EGLIFE : WBNB -> USDT -> EGLIFE
  if (from === "BNB" && to === "EGLIFE") {
    return [
      TOKENS.WBNB.address as string,
      TOKENS.USDT.address as string,
      TOKENS.EGLIFE.address as string,
    ];
  }
  if (from === "EGLIFE" && to === "BNB") {
    return [
      TOKENS.EGLIFE.address as string,
      TOKENS.USDT.address as string,
      TOKENS.WBNB.address as string,
    ];
  }

  // 2️⃣ USDT <-> EGLIFE : direct
  if (from === "USDT" && to === "EGLIFE") {
    return [
      TOKENS.USDT.address as string,
      TOKENS.EGLIFE.address as string,
    ];
  }
  if (from === "EGLIFE" && to === "USDT") {
    return [
      TOKENS.EGLIFE.address as string,
      TOKENS.USDT.address as string,
    ];
  }

  // 3️⃣ BNB <-> USDT : WBNB <-> USDT
  if (from === "BNB" && to === "USDT") {
    return [
      TOKENS.WBNB.address as string,
      TOKENS.USDT.address as string,
    ];
  }
  if (from === "USDT" && to === "BNB") {
    return [
      TOKENS.USDT.address as string,
      TOKENS.WBNB.address as string,
    ];
  }

  // 4️⃣ fallback: direct ERC20 <-> ERC20
  return [addr(from), addr(to)];
}

export default function SwapPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<any>(null);

  const [fromToken, setFromToken] = useState<TokenKey>("BNB");
  const [toToken, setToToken] = useState<TokenKey>("EGLIFE");
  const [amountIn, setAmountIn] = useState<string>("");
  const [amountOut, setAmountOut] = useState<string>("");
  const [estimating, setEstimating] = useState<boolean>(false);
  const [swapStatus, setSwapStatus] = useState<StatusType>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");

  const [txHash, setTxHash] = useState<string | null>(null);

  const [balances, setBalances] = useState<{
    BNB: string;
    USDT: string;
    EGLIFE: string;
  }>({
    BNB: "-",
    USDT: "-",
    EGLIFE: "-",
  });

  // ✅ User balances load karein
  async function loadBalances(addr: string, prov: BrowserProvider) {
    try {
      // BNB balance
      const bnbWei = await prov.getBalance(addr);
      const bnb = Number(formatUnits(bnbWei, 18)).toFixed(4);

      let usdt = "-";
      let eglife = "-";

      // USDT balance
      if (TOKENS.USDT.address) {
        try {
          const usdtContract = new Contract(
            TOKENS.USDT.address,
            ERC20_ABI,
            prov
          );
          const usdtBal = await usdtContract.balanceOf(addr);
          usdt = Number(
            formatUnits(usdtBal, TOKENS.USDT.decimals)
          ).toFixed(2);
        } catch (e) {
          console.warn("USDT balance fetch failed", e);
        }
      }

      // EGLIFE balance
      if (TOKENS.EGLIFE.address) {
        try {
          const egContract = new Contract(
            TOKENS.EGLIFE.address,
            ERC20_ABI,
            prov
          );
          const egBal = await egContract.balanceOf(addr);
          eglife = Number(
            formatUnits(egBal, TOKENS.EGLIFE.decimals)
          ).toFixed(2);
        } catch (e) {
          console.warn("EGLIFE balance fetch failed", e);
        }
      }

      setBalances({
        BNB: bnb,
        USDT: usdt,
        EGLIFE: eglife,
      });
    } catch (e) {
      console.error("loadBalances main error", e);
    }
  }

  // ✅ Wallet connect (any Web3 wallet + auto BSC switch/add)
  async function connectWallet() {
    try {
      if (typeof window === "undefined") {
        alert("Browser environment required.");
        return;
      }

      // ✅ Koi bhi injected Web3 wallet provider pick karo
      const injected =
        window.ethereum ||
        (window.BinanceChain && window.BinanceChain.ethereum) ||
        window.BinanceChain;

      if (!injected) {
        alert(
          "Koi Web3 wallet (MetaMask / TrustWallet / Binance Wallet, etc.) browser me nahi mila.\nKripya wallet extension ya DApp browser use karein."
        );
        return;
      }

      // 🔁 Auto add / switch to BSC
      const switched = await addOrSwitchBSC(injected);
      if (!switched) {
        alert("Please switch to BNB Smart Chain (BSC Mainnet) in your wallet.");
        return;
      }

      const ethProvider = new BrowserProvider(injected);
      const signer = await ethProvider.getSigner();
      const addr = await signer.getAddress();
      const network = await ethProvider.getNetwork();

      // Extra safety: verify chainId
      if (network.chainId !== BigInt(BSC_CHAIN_ID)) {
        alert("Still not on BSC Mainnet. Please check your wallet network.");
        return;
      }

      setProvider(ethProvider);
      setSigner(signer);
      setAccount(addr);

      await loadBalances(addr, ethProvider);
    } catch (err: any) {
      console.error("connectWallet error", err);
      alert(err?.message || "Wallet connect fail hua");
    }
  }

  // ✅ Estimate output amount
  async function estimateOut() {
    try {
      setTxHash(null);
      setStatusMessage("");

      if (!provider) return;
      if (!amountIn || Number(amountIn) <= 0) {
        setAmountOut("");
        return;
      }
      if (fromToken === toToken) {
        setAmountOut(amountIn);
        return;
      }

      setEstimating(true);

      const router = new Contract(
        PANCAKE_ROUTER_V2,
        PANCAKE_ROUTER_ABI,
        provider
      );

      const path = buildPath(fromToken, toToken);
      const fromDecimals = TOKENS[fromToken].decimals;
      const inWei = parseUnits(amountIn, fromDecimals);

      const amountsOut = (await router.getAmountsOut(
        inWei,
        path
      )) as bigint[];

      const outDecimals = TOKENS[toToken].decimals;
      const last = amountsOut[amountsOut.length - 1];
      const formatted = formatUnits(last, outDecimals);
      setAmountOut(formatted);
    } catch (err) {
      console.error("estimateOut error", err);
      setAmountOut("");
      setStatusMessage(
        "Route unavailable / is pair ke liye liquidity kam ya nahi hai."
      );
    } finally {
      setEstimating(false);
    }
  }

  useEffect(() => {
    if (provider) {
      estimateOut();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountIn, fromToken, toToken, provider]);

  useEffect(() => {
    if (account && provider) {
      loadBalances(account, provider);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, provider]);

  // ✅ Allowance + approve (ethers v6, bigint)
  async function ensureAllowance(
    tokenAddress: string,
    owner: string,
    spender: string,
    requiredAmount: bigint
  ) {
    if (!signer || !provider) throw new Error("Wallet not connected");

    const token = new Contract(tokenAddress, ERC20_ABI, provider);
    const current = (await token.allowance(owner, spender)) as bigint;

    if (current >= requiredAmount) return;

    const tokenWithSigner: any = token.connect(signer);
    const tx = await tokenWithSigner.approve(spender, requiredAmount);
    setStatusMessage("Approval tx sent, waiting for confirmation...");
    await tx.wait();
  }

  // ✅ Main swap
  async function handleSwap() {
    try {
      setSwapStatus("loading");
      setStatusMessage("Preparing swap...");
      setTxHash(null);

      if (!account || !signer || !provider) {
        throw new Error("Please connect wallet first.");
      }
      if (!amountIn || Number(amountIn) <= 0) {
        throw new Error("Enter a valid amount.");
      }
      if (fromToken === toToken) {
        throw new Error("From & To token cannot be same.");
      }

      const routerWithSigner = new Contract(
        PANCAKE_ROUTER_V2,
        PANCAKE_ROUTER_ABI,
        signer
      );
      const routerRead = new Contract(
        PANCAKE_ROUTER_V2,
        PANCAKE_ROUTER_ABI,
        provider
      );

      const path = buildPath(fromToken, toToken);
      const fromDecimals = TOKENS[fromToken].decimals;
      const inWei = parseUnits(amountIn, fromDecimals);

      // Slippage 1%
      const amountsOut = (await routerRead.getAmountsOut(
        inWei,
        path
      )) as bigint[];
      const expectedOut = amountsOut[amountsOut.length - 1];
      const minOut = (expectedOut * 99n) / 100n; // 1% slippage

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 10);

      let tx: any;

      setStatusMessage("Sending swap transaction...");

      // CASE 1: BNB → ERC20
      if (fromToken === "BNB") {
        tx =
          await routerWithSigner.swapExactETHForTokensSupportingFeeOnTransferTokens(
            minOut,
            path,
            account,
            deadline,
            {
              value: inWei,
            }
          );
      }
      // CASE 2: ERC20 → BNB
      else if (toToken === "BNB") {
        const fromAddress = TOKENS[fromToken].address!;
        await ensureAllowance(fromAddress, account, PANCAKE_ROUTER_V2, inWei);

        tx =
          await routerWithSigner.swapExactTokensForETHSupportingFeeOnTransferTokens(
            inWei,
            minOut,
            path,
            account,
            deadline
          );
      }
      // CASE 3: ERC20 → ERC20
      else {
        const fromAddress = TOKENS[fromToken].address!;
        await ensureAllowance(fromAddress, account, PANCAKE_ROUTER_V2, inWei);

        tx =
          await routerWithSigner.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            inWei,
            minOut,
            path,
            account,
            deadline
          );
      }

      setStatusMessage("Transaction sent. Waiting for confirmation...");
      const receipt = await tx.wait();
      setTxHash(receipt.hash || receipt.transactionHash);
      setSwapStatus("success");
      setStatusMessage("Swap successful!");
      if (account && provider) {
        await loadBalances(account, provider);
      }
    } catch (err: any) {
      console.error("swap error", err);
      setSwapStatus("error");
      setStatusMessage(err?.message || "Swap failed");
    }
  }

  function handleSwitchTokens() {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmountOut("");
  }

  return (
    <div className="min-h-screen flex justify-center items-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-md bg-slate-900/70 border border-slate-700 rounded-2xl p-5 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-semibold">EGPAYEDX Swap</h1>
          {account ? (
            <button
              onClick={connectWallet}
              className="px-3 py-1 text-xs bg-emerald-600 rounded-full"
              title={account}
            >
              {account.slice(0, 6)}...{account.slice(-4)}
            </button>
          ) : (
            <button
              onClick={connectWallet}
              className="px-3 py-1 text-xs bg-emerald-600 rounded-full hover:bg-emerald-500"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              setFromToken("BNB");
              setToToken("EGLIFE");
              setAmountIn("0.01");
            }}
            className="px-2 py-1 text-[11px] bg-slate-800 rounded-full border border-slate-600"
          >
            Buy EGLIFE (0.01 BNB)
          </button>

          <button
            type="button"
            onClick={() => {
              setFromToken("EGLIFE");
              setToToken("USDT");
              const eg =
                balances.EGLIFE !== "-" ? Number(balances.EGLIFE) : 0;
              if (eg > 0) {
                setAmountIn((eg / 2).toFixed(2));
              } else {
                setAmountIn("100");
              }
            }}
            className="px-2 py-1 text-[11px] bg-slate-800 rounded-full border border-slate-600"
          >
            Sell EGLIFE → USDT
          </button>
        </div>

        {/* FROM */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-sm text-slate-300">From</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2">
            <select
              className="bg-transparent text-sm outline-none flex-1"
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value as TokenKey)}
            >
              <option value="BNB">BNB</option>
              <option value="EGLIFE">EGLIFE</option>
              <option value="USDT">USDT</option>
            </select>

            <button
              type="button"
              onClick={() => {
                const bal =
                  fromToken === "BNB"
                    ? balances.BNB
                    : fromToken === "USDT"
                    ? balances.USDT
                    : balances.EGLIFE;
                if (bal !== "-" && Number(bal) > 0) {
                  setAmountIn(bal.toString());
                }
              }}
              className="text-[10px] px-2 py-1 border border-slate-500 rounded-full"
            >
              MAX
            </button>

            <input
              type="number"
              min="0"
              step="any"
              className="bg-transparent text-right text-lg outline-none flex-1"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
            />
          </div>
        </div>

        {/* SWITCH BUTTON */}
        <div className="flex justify-center my-2">
          <button
            onClick={handleSwitchTokens}
            className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full text-xs"
          >
            ⇅
          </button>
        </div>

        {/* TO */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-sm text-slate-300">To (estimated)</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2">
            <select
              className="bg-transparent text-sm outline-none flex-1"
              value={toToken}
              onChange={(e) => setToToken(e.target.value as TokenKey)}
            >
              <option value="EGLIFE">EGLIFE</option>
              <option value="USDT">USDT</option>
              <option value="BNB">BNB</option>
            </select>
            <input
              type="text"
              className="bg-transparent text-right text-lg outline-none flex-1"
              placeholder={estimating ? "Calculating..." : "0.0"}
              value={amountOut}
              readOnly
            />
          </div>
        </div>

        {/* STATUS */}
        {statusMessage && (
          <p
            className={`text-xs mt-2 ${
              swapStatus === "error"
                ? "text-red-400"
                : swapStatus === "success"
                ? "text-emerald-400"
                : "text-slate-300"
            }`}
          >
            {statusMessage}
          </p>
        )}

        {txHash && (
          <a
            href={`https://bscscan.com/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-emerald-400 underline mt-1 inline-block"
          >
            View on BscScan
          </a>
        )}

        {/* ACTION BUTTON */}
        <button
          disabled={swapStatus === "loading" || !account}
          onClick={handleSwap}
          className="mt-4 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
        >
          {account
            ? swapStatus === "loading"
              ? "Swapping..."
              : "Swap Now"
            : "Connect Wallet to Swap"}
        </button>

        {/* BALANCES */}
        <div className="mt-3 text-[10px] text-slate-400 space-y-1">
          <div>Balance BNB: {balances.BNB}</div>
          <div>Balance USDT: {balances.USDT}</div>
          <div>Balance EGLIFE: {balances.EGLIFE}</div>
        </div>

        <p className="mt-3 text-[10px] text-slate-500 text-center">
          Swaps are executed via PancakeSwap V2 Router on BNB Smart Chain.
        </p>
      </div>
    </div>
  );
}