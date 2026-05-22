import { type NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_PREFIXES = [
  "/api/sessions",
  "/api/search",
  "/api/ingest",
  "/api/health",
];

const PUBLIC_PATHS = ["/login", "/setup"];

async function verifyHmac(cookieValue: string): Promise<boolean> {
  try {
    const secret = process.env.NEXTAUTH_SECRET ?? process.env.ADMIN_TOKEN ?? "";
    if (!secret) return false;

    const dotIdx = cookieValue.lastIndexOf(".");
    if (dotIdx <= 0) return false;

    const token = cookieValue.slice(0, dotIdx);
    const sig = cookieValue.slice(dotIdx + 1);

    if (sig.length !== 64 || !/^[0-9a-f]+$/.test(sig)) return false;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expected = await crypto.subtle.sign("HMAC", key, enc.encode(token));
    const expectedHex = Array.from(new Uint8Array(expected))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    if (expectedHex.length !== sig.length) return false;
    let diff = 0;
    for (let i = 0; i < expectedHex.length; i++) {
      diff |= expectedHex.charCodeAt(i) ^ sig.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (EXTERNAL_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("admin_session")?.value;

  if (cookie && (await verifyHmac(cookie))) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
