import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ⚠️ ENV me rakhna hoga
// PAYSPRINT_BASE_URL
// PAYSPRINT_TOKEN
// PAYSPRINT_PARTNER_ID

async function callPaysprint(payload: any) {
  const res = await fetch(
    `${process.env.PAYSPRINT_BASE_URL}/recharge/api/v1/doRecharge`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Token": process.env.PAYSPRINT_TOKEN!,
        "Authorisedkey": process.env.PAYSPRINT_PARTNER_ID!,
      },
      body: JSON.stringify(payload),
    }
  );

  return res.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, operator, account, amount } = body;

    if (!orderId || !operator || !account || !amount) {
      return NextResponse.json(
        { ok: false, message: "Invalid request" },
        { status: 400 }
      );
    }

    // 🔹 Paysprint payload (example – exact fields API doc se match karenge)
    const payload = {
      operator,
      canumber: account,
      amount,
      referenceid: orderId,
    };

    const psRes = await callPaysprint(payload);

    // TODO:
    // - Save response to DB
    // - status = SUCCESS / FAILED / PENDING

    return NextResponse.json({
      ok: true,
      orderId,
      paysprint: psRes,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: "Recharge failed" },
      { status: 500 }
    );
  }
}
