import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const dynamic = "force-dynamic"; // Next.js: always dynamic (no cache)

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

function jsonNoStore(body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

export async function GET() {
  try {
    const rpc = process.env.BSC_RPC_URL || process.env.RPC_URL;
    if (!rpc) {
      return jsonNoStore({ ok: false, error: "RPC_URL missing in env" }, { status: 500 });
    }

    const token = process.env.TOKEN_ADDRESS;
    const admin = process.env.ADMIN_WALLET_ADDRESS;

    if (!token || !admin) {
      return jsonNoStore(
        { ok: false, error: "TOKEN_ADDRESS / ADMIN_WALLET_ADDRESS missing in env" },
        { status: 500 }
      );
    }

    // basic address validation
    if (!ethers.isAddress(token)) {
      return jsonNoStore({ ok: false, error: "Invalid TOKEN_ADDRESS" }, { status: 400 });
    }
    if (!ethers.isAddress(admin)) {
      return jsonNoStore({ ok: false, error: "Invalid ADMIN_WALLET_ADDRESS" }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(rpc);

    // Optional sanity check: chain id (BSC mainnet = 56)
    // If you use testnet, set EXPECTED_CHAIN_ID=97 in env.
    const expectedChainId = process.env.EXPECTED_CHAIN_ID
      ? Number(process.env.EXPECTED_CHAIN_ID)
      : undefined;

    if (expectedChainId) {
      const net = await provider.getNetwork();
      if (Number(net.chainId) !== expectedChainId) {
        return jsonNoStore(
          {
            ok: false,
            error: `Wrong network. Expected chainId=${expectedChainId}, got chainId=${net.chainId}`,
          },
          { status: 400 }
        );
      }
    }

    const c = new ethers.Contract(token, ERC20_ABI, provider);

    const [bal, dec, sym] = await Promise.all([
      c.balanceOf(admin),
      c.decimals(),
      c.symbol(),
    ]);

    const decimals = Number(dec);

    return jsonNoStore({
      ok: true,
      token,
      admin,
      symbol: String(sym),
      decimals,
      balanceRaw: bal.toString(),
      balance: ethers.formatUnits(bal, decimals),
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return jsonNoStore(
      { ok: false, error: e?.shortMessage || e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}