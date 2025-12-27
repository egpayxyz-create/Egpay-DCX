// lib/paysprint.ts
import jwt from "jsonwebtoken";
import crypto from "crypto";

function must(name: string, v?: string) {
  if (!v) throw new Error(`Missing ${name} in env`);
  return v;
}

export function paysprintConfig() {
  return {
    baseUrl: must("PAYSPRINT_BASE_URL", process.env.PAYSPRINT_BASE_URL), // e.g. https://api.paysprint.in
    partnerId: must("PAYSPRINT_PARTNER_ID", process.env.PAYSPRINT_PARTNER_ID),
    jwtKey: must("PAYSPRINT_JWT_KEY", process.env.PAYSPRINT_JWT_KEY),
    authorisedKey: must("PAYSPRINT_AUTHORISED_KEY", process.env.PAYSPRINT_AUTHORISED_KEY),

    // Optional (agar encryption enabled ho)
    aesKey: process.env.PAYSPRINT_AES_KEY,
    aesIv: process.env.PAYSPRINT_AES_IV,
    environment: process.env.PAYSPRINT_ENVIRONMENT || "UAT",
  };
}

export function makePaysprintJwt(reqid: string | number) {
  const { partnerId, jwtKey } = paysprintConfig();

  const payload = {
    timestamp: Date.now(),     // agar Paysprint seconds maangta ho to Math.floor(Date.now()/1000)
    partnerId,
    reqid: String(reqid),      // ✅ safer than Number()
  };

  return jwt.sign(payload, jwtKey, { algorithm: "HS256" });
}

// ✅ Optional: AES encryption helper (use only if Paysprint requires encrypted payload)
export function aesEncryptIfEnabled(plainObj: any) {
  const { aesKey, aesIv } = paysprintConfig();
  if (!aesKey || !aesIv) return { encrypted: false, data: plainObj };

  // NOTE: key/iv length must match algorithm. Often AES-256-CBC expects 32-byte key & 16-byte iv.
  const key = Buffer.from(aesKey, "utf8");
  const iv = Buffer.from(aesIv, "utf8");

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const input = JSON.stringify(plainObj);

  let enc = cipher.update(input, "utf8", "base64");
  enc += cipher.final("base64");

  // Many APIs expect { data: "<encrypted>" }
  return { encrypted: true, data: { data: enc } };
}

export async function paysprintPost<T>(path: string, body: any, reqid: string | number): Promise<T> {
  const { baseUrl, authorisedKey } = paysprintConfig();
  const token = makePaysprintJwt(reqid);

  const enc = aesEncryptIfEnabled(body);

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Authorization": token,
      "Authorisedkey": authorisedKey, // ✅ panel me jo exact ho wahi rakhein
    } as any,
    body: JSON.stringify(enc.data),
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    throw new Error(`Paysprint HTTP ${res.status}: ${JSON.stringify(data)}`);
  }

  return data as T;
}
