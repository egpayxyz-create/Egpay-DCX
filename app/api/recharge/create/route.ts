import { NextResponse } from "next/server";

export const runtime = "nodejs";

// NOTE: Later DB connect hoga (Prisma / Mongo / SQL)
function generateOrderId() {
  return "RCG_" + Date.now();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      service,
      operator,
      account,
      amount,
      customerName,
    } = body;

    // 🔐 Basic validation
    if (!service || !operator || !account || !amount) {
      return NextResponse.json(
        { ok: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const orderId = generateOrderId();

    // TODO: Save to DB
    // status = CREATED / PENDING
    // amount, operator, account, service, userId

    return NextResponse.json({
      ok: true,
      orderId,
      status: "CREATED",
      message: "Recharge order created",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 }
    );
  }
}
