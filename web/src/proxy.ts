import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, SESSION_SECONDS, issueSession, reserveLoginAttempt, validSession } from "./lib/auth.server";

// No matcher exclusions: pages, RSC responses, and static assets all require auth.
export async function proxy(request: NextRequest) {
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;
  const sessionSecret = process.env.AUTH_SESSION_SECRET;
  const headers = { "Cache-Control": "private, no-store" };

  // Missing configuration must never expose the demo.
  if (!username || !password || !sessionSecret || sessionSecret.length < 32 || sessionSecret === password) {
    return new NextResponse("Authentication is not configured", { status: 503, headers });
  }

  const sessionValid = validSession(request.cookies.get(AUTH_COOKIE)?.value, username, password, sessionSecret);
  if (!sessionValid) {
    const authorization = request.headers.get("authorization");
    if (authorization !== null) {
      try {
        const retryAfter = await reserveLoginAttempt();
        if (retryAfter) {
          return new NextResponse("Too many authentication attempts", {
            status: 429, headers: { ...headers, "Retry-After": String(retryAfter) },
          });
        }
      } catch (error) {
        console.error("Authentication storage failure", error instanceof Error ? error.name : "UnknownError");
        // Do not expose database errors or fall back to an instance-local counter.
        return new NextResponse("Authentication temporarily unavailable", { status: 503, headers });
      }
    }
    const token = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization ?? "")?.[1];
    const expected = Buffer.from(`${username}:${password}`, "utf8").toString("base64");
    const digest = (value: string) => createHash("sha256").update(value).digest();

    if (!token || !timingSafeEqual(digest(token), digest(expected))) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { ...headers, "WWW-Authenticate": 'Basic realm="action.anxol.com", charset="UTF-8"' },
      });
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("authorization");
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Cache-Control", headers["Cache-Control"]);
  if (!sessionValid) {
    response.cookies.set(AUTH_COOKIE, issueSession(username, password, sessionSecret), {
      httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: SESSION_SECONDS,
    });
  }
  return response;
}
