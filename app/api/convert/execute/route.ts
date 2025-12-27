import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

// Minimal ERC20 ABI
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
];

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}

/**
 * Production auth:
 * Add in .env.local:
 *   EXECUTE_SECRET=some_long_random_secret
 * Client/Admin request must send:
 *   x-exec-secret: <EXECUTE_SECRET>
 */
function requireExecAuth(req: Request) {
  const secret = process.env.EXECUTE_SECRET;
  if (!secret) return { ok: false, msg: "EXECUTE_SECRET not set" as const };

  const got = req.headers.get("x-exec-secret") || "";
  if (!got || got !== secret) return { ok: false, msg: "Unauthorized" as const };

  return { ok: true as const };
}

export async function POST(req: Request) {
  try {
    // ✅ Must be protected
    const auth = requireExecAuth(req);
    if (!auth.ok) return bad(auth.msg, auth.msg === "Unauthorized" ? 401 : 500);

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId || "").trim();

    if (!orderId) return bad("Missing orderId");

    // ---- ENV ----
    const RPC_URL = process.env.BSC_RPC_URL || process.env.RPC_URL;
    const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
    const TOKEN_ADDRESS = process.env.EGLIFE_TOKEN_ADDRESS || process.env.TOKEN_ADDRESS;

    if (!RPC_URL) return bad("RPC_URL not set", 500);
    if (!PRIVATE_KEY) return bad("ADMIN_PRIVATE_KEY not set", 500);
    if (!TOKEN_ADDRESS) return bad("TOKEN_ADDRESS not set", 500);
    if (!ethers.isAddress(TOKEN_ADDRESS)) return bad("Invalid TOKEN_ADDRESS", 500);

    // ✅ DB transaction for idempotency
    const client = await pool.connect();

    let toAddress = "";
    let amountOut = 0;
    let status = "";
    let existingTx = "";

    try {
      await client.query("BEGIN");

      // lock order row
      const q = await client.query(
        `
        select id, status, to_address, amount_out, tx_hash
        from buy_crypto_orders
        where id = $1
        for update
        `,
        [orderId],
      );

      if (q.rowCount === 0) {
        await client.query("ROLLBACK");
        return bad("Order not found", 404);
      }

      const row = q.rows[0];
      status = String(row.status || "");
      toAddress = String(row.to_address || "");
      amountOut = Number(row.amount_out || 0);
      existingTx = String(row.tx_hash || "");

      // ✅ Allow only APPROVED orders
      if (status !== "APPROVED") {
        await client.query("ROLLBACK");
        return bad(`Order not approved. Current status: ${status}`, 409);
      }

      // ✅ Idempotent: if already transferred, return same hash
      if (existingTx) {
        await client.query("COMMIT");
        return NextResponse.json({
          ok: true,
          alreadyDone: true,
          orderId,
          txHash: existingTx,
        });
      }

      // validations
      if (!ethers.isAddress(toAddress)) {
        await client.query("ROLLBACK");
        return bad("Invalid payout address in DB", 500);
      }
      if (!Number.isFinite(amountOut) || amountOut <= 0) {
        await client.query("ROLLBACK");
        return bad("Invalid amount_out in DB", 500);
      }

      // ---- PROVIDER & WALLET ----
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

      // ---- TOKEN CONTRACT ----
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);
      const decimals: number = await tokenContract.decimals();
      const amountRaw = ethers.parseUnits(String(amountOut), decimals);

      // ---- BALANCE CHECK ----
      const bal: bigint = await tokenContract.balanceOf(wallet.address);
      if (bal < amountRaw) {
        await client.query("ROLLBACK");
        return bad("Insufficient token liquidity", 409);
      }

      // ---- TRANSFER ----
      const tx = await tokenContract.transfer(toAddress, amountRaw);
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        await client.query("ROLLBACK");
        return bad("Transaction failed", 500);
      }

      // ✅ Persist tx_hash (single source of truth)
      await client.query(
        `
        update buy_crypto_orders
        set tx_hash = $2,
            status = 'TRANSFERRED',
            updated_at = now(),
            admin_note = coalesce(admin_note,'') || $3
        where id = $1
        `,
        [orderId, tx.hash, ` | TX:${tx.hash}`],
      );

      await client.query("COMMIT");

      return NextResponse.json({
        ok: true,
        orderId,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
      });
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      return bad("Token transfer failed", 500);
    } finally {
      client.release();
    }
  } catch {
    return bad("Server error", 500);
  }
}
