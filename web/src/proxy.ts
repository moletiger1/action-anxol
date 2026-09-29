import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

// No matcher exclusions: pages, RSC responses, and static assets all require auth.
export function proxy(request: NextRequest) {
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;
  const headers = { "Cache-Control": "private, no-store" };

  // Missing configuration must never expose the demo.
  if (!username || !password) {
    return new NextResponse("Authentication is not configured", { status: 503, headers });
  }

  const token = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(
    request.headers.get("authorization") ?? "",
  )?.[1];
  const expected = Buffer.from(`${username}:${password}`, "utf8").toString("base64");
  const digest = (value: string) => createHash("sha256").update(value).digest();

  if (!token || !timingSafeEqual(digest(token), digest(expected))) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { ...headers, "WWW-Authenticate": 'Basic realm="action.anxol.com", charset="UTF-8"' },
    });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("authorization");
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Cache-Control", headers["Cache-Control"]);
  return response;
}
