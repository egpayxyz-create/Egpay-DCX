import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const r = await pool.query("select now() as now");
    return NextResponse.json({
      ok: true,
      now: r.rows[0].now
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Database connection failed"
      },
      { status: 500 }
    );
  }
}
