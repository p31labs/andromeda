/**
 * CWP-25: Bouncer v2 — JWT Auth with Room Code Scoping
 *
 * Cryptographic gateway for the K₄ mesh.
 * Room code → JWT → namespace-scoped access.
 */

const JWT_SECRET_KEY = "P31_JWT_SECRET";
const TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // POST /auth — authenticate with room code
    if (url.pathname === "/auth" && request.method === "POST") {
      const { userId, roomCode, name, color, role } = await request.json();

      if (!userId || !roomCode) {
        return Response.json({ error: "userId and roomCode required" }, { status: 400 });
      }

      // Validate room code format (4-6 alphanumeric)
      if (!/^[A-Z0-9]{4,6}$/i.test(roomCode)) {
        return Response.json({ error: "Invalid room code format" }, { status: 400 });
      }

      // Derive signing key from room code via PBKDF2
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(env[JWT_SECRET_KEY] || "p31-default-secret"),
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"]
      );

      const signingKey = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: encoder.encode(roomCode.toUpperCase()),
          iterations: 100000,
          hash: "SHA-256"
        },
        keyMaterial,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
      );

      // Build JWT payload
      const now = Date.now();
      const payload = btoa(JSON.stringify({
        sub: userId,
        scope: roomCode.toUpperCase(),
        name: name || userId,
        color: color || "#00F0FF",
        role: role || "participant",
        iat: Math.floor(now / 1000),
        exp: Math.floor((now + TOKEN_TTL) / 1000),
      }));

      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));

      // Sign the JWT
      const signature = await crypto.subtle.sign(
        "HMAC",
        signingKey,
        encoder.encode(`${header}.${payload}`)
      );
      const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const token = `${header}.${payload}.${sig}`;

      return Response.json({
        token,
        expiresAt: now + TOKEN_TTL,
        user: { id: userId, name: name || userId, role: role || "participant" }
      });
    }

    // POST /verify — validate a JWT and return claims
    if (url.pathname === "/verify" && request.method === "POST") {
      const { token } = await request.json();

      if (!token) {
        return Response.json({ error: "No token" }, { status: 400 });
      }

      try {
        const [header, payload, sig] = token.split(".");
        const claims = JSON.parse(atob(payload));

        // Check expiry
        if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
          return Response.json({ valid: false, error: "Token expired" }, { status: 401 });
        }

        // Verify signature
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          "raw",
          encoder.encode(env[JWT_SECRET_KEY] || "p31-default-secret"),
          "PBKDF2",
          false,
          ["deriveBits", "deriveKey"]
        );

        const signingKey = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: encoder.encode(claims.scope),
            iterations: 100000,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign", "verify"]
        );

        const sigBytes = Uint8Array.from(
          atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
          c => c.charCodeAt(0)
        );

        const valid = await crypto.subtle.verify(
          "HMAC",
          signingKey,
          sigBytes,
          encoder.encode(`${header}.${payload}`)
        );

        if (!valid) {
          return Response.json({ valid: false, error: "Invalid signature" }, { status: 401 });
        }

        return Response.json({ valid: true, claims });
      } catch (e) {
        return Response.json({ valid: false, error: e.message }, { status: 400 });
      }
    }

    // GET /health
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: "p31-bouncer" });
    }

    return Response.json({ error: "not_found" }, { status: 404 });
  }
};