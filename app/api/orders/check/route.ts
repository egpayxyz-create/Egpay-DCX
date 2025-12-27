import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  orderId: string;
  utr: string;
};

function cleanUtr(v: string) {
  return (v || "").trim().replace(/\s+/g, "");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const orderId = (body.orderId || "").trim();
    const utr = cleanUtr(body.utr);

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "Missing orderId" }, { status: 400 });
    }
    // UTR usually 12 digits, but some apps show longer; we keep basic validation
    if (utr.length < 10) {
      return NextResponse.json({ ok: false, error: "Invalid UTR" }, { status: 400 });
    }

    // TODO: DB update here (recommended)
    // Example logic (pseudo):
    // - find order by orderId
    // - if already PAID/SUBMITTED -> return idempotent response
    // - else save utr, set status SUBMITTED, updatedAt

    return NextResponse.json({
      ok: true,
      orderId,
      status: "SUBMITTED",
      utr,
      message: "UTR saved. Awaiting confirmation."
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Check order failed" },
      { status: 500 }
    );
  }
}
