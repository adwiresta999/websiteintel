// netlify/functions/auth.js
// Login portal internal — set env vars:
//   ADMIN_USERNAME = username admin
//   ADMIN_PASSWORD = password admin (plain, atau ganti dengan bcrypt)
//   JWT_SECRET     = string rahasia panjang untuk JWT

const crypto = require("crypto");

// Simple JWT implementation (no external deps)
function base64url(str) {
  return Buffer.from(str).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function createJWT(payload, secret) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body   = base64url(JSON.stringify(payload));
  const sig    = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyJWT(token, secret) {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch { return null; }
}

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "" };

  // POST /auth — login
  if (event.httpMethod === "POST") {
    let data;
    try { data = JSON.parse(event.body); } catch { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) }; }

    const { username, password } = data;
    const validUser = process.env.ADMIN_USERNAME || "admin";
    const validPass = process.env.ADMIN_PASSWORD || "changeme123";
    const secret    = process.env.JWT_SECRET || "default-secret-change-this";

    if (username !== validUser || password !== validPass) {
      // Delay to prevent brute-force
      await new Promise(r => setTimeout(r, 1000));
      return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Username atau password salah." }) };
    }

    const token = createJWT(
      { sub: username, role: "admin", iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 86400 },
      secret
    );

    return { statusCode: 200, headers: cors, body: JSON.stringify({ token, expires: "24h" }) };
  }

  // GET /auth?action=verify — verify token
  if (event.httpMethod === "GET") {
    const authHeader = event.headers["authorization"] || "";
    const token = authHeader.replace("Bearer ", "");
    const secret = process.env.JWT_SECRET || "default-secret-change-this";
    const payload = verifyJWT(token, secret);
    if (!payload) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Token tidak valid atau kadaluarsa." }) };
    return { statusCode: 200, headers: cors, body: JSON.stringify({ valid: true, user: payload.sub, role: payload.role }) };
  }

  return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
};
