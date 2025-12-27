import { NextResponse } from "next/server";
import { ethers } from "ethers";

// Minimal ERC20 ABI
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const coin = String(body.coin || "EGLIFE").toUpperCase();
    const to = String(body.to || "");
    const coinAmountRaw = body.coinAmount; // frontend से आएगा

    // ✅ address validation
    if (!ethers.isAddress(to)) {
      return NextResponse.json({ error: "Invalid payout address" }, { status: 400 });
    }

    // ✅ amount validation
    const coinAmountStr = String(coinAmountRaw ?? "");
    const coinAmountNum = Number(coinAmountStr);

    if (!coinAmountStr || !Number.isFinite(coinAmountNum) || coinAmountNum <= 0) {
      return NextResponse.json({ error: "Invalid coinAmount" }, { status: 400 });
    }

    // ENV
    const RPC_URL = process.env.BSC_RPC_URL!;
    const SERVER_PK = process.env.EGPAY_TREASURY_PRIVATE_KEY!;

    if (!RPC_URL || !SERVER_PK) {
      return NextResponse.json(
        { error: "Server env missing: BSC_RPC_URL / EGPAY_TREASURY_PRIVATE_KEY" },
        { status: 500 }
      );
    }

    // ✅ Token mapping (env based)
    const TOKEN_BY_SYMBOL: Record<string, string | undefined> = {
      EGLIFE: process.env.EGLIFE_ADDRESS,
      USDT: process.env.USDT_ADDRESS,
    };

    const tokenAddress = TOKEN_BY_SYMBOL[coin];
    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      return NextResponse.json(
        { error: `Unsupported coin or missing address in env: ${coin}` },
        { status: 400 }
      );
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(SERVER_PK, provider);

    // Typed contract
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    const decimals: number = await token.decimals();

    // ✅ Dynamic amount (quote के हिसाब से)
    // NOTE: parseUnits expects decimal string. We keep it as string.
    const amount = ethers.parseUnits(coinAmountStr, decimals);

    const tx = await token.transfer(to, amount);
    const receipt = await tx.wait();

    return NextResponse.json({
      ok: true,
      coin,
      tokenAddress,
      to,
      coinAmount: coinAmountStr,
      amount: amount.toString(),
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Execute server error" },
      { status: 500 }
    );
  }
}