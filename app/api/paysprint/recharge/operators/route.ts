import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

function must(name: string, v?: string) {
  if (!v) throw new Error(`Missing ${name} in env`);
  return v;
}

function cfg() {
  return {
    // IMPORTANT: baseUrl should be like:
    // UAT: https://sit.paysprint.in/service-api
    baseUrl: must("PAYSPRINT_BASE_URL", process.env.PAYSPRINT_BASE_URL),
    partnerId: must("PAYSPRINT_PARTNER_ID", process.env.PAYSPRINT_PARTNER_ID), // e.g. PS002091 or actual PartnerId from Paysprint
    jwtKey: must("PAYSPRINT_JWT_KEY", process.env.PAYSPRINT_JWT_KEY),
    authorisedKey: must("PAYSPRINT_AUTHORISED_KEY", process.env.PAYSPRINT_AUTHORISED_KEY),
    environment: (process.env.PAYSPRINT_ENVIRONMENT || "UAT").toUpperCase(), // UAT / LIVE
  };
}

function makePaysprintJwt(reqid: number) {
  const { partnerId, jwtKey } = cfg();

  // Paysprint docs payload generally expects partnerId + timestamp + reqid
  const payload = {
    timestamp: Math.floor(Date.now() / 1000), // many Paysprint examples use seconds
    partnerId,
    reqid: Number(reqid),
  };

  return jwt.sign(payload, jwtKey, { algorithm: "HS256" });
}

async function paysprintPost(path: string, body: any, reqid: number) {
  const { baseUrl, authorisedKey, environment } = cfg();
  const url = `${baseUrl}${path}`;
  const token = makePaysprintJwt(reqid);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Token: token, // Paysprint expects header key: Token
  };

  // UAT me Authorisedkey required
  if (environment === "UAT") {
    headers["Authorisedkey"] = authorisedKey;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(
      `Paysprint POST failed (${res.status} ${res.statusText}) @ ${url} :: ${JSON.stringify(data)}`
    );
  }

  return data;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST this route to fetch operator list",
    expects: {
      method: "POST",
      body: {},
    },
  });
}

export async function POST(req: Request) {
  try {
    const reqid = Date.now();

    // operators API doesn’t require body (per your doc), keep empty
    const body = await req.json().catch(() => ({}));

    const data = await paysprintPost(
      "/api/v1/service/recharge/recharge/getoperator",
      body && Object.keys(body).length ? body : {},
      reqid
    );

    return NextResponse.json({ ok: true, reqid, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
