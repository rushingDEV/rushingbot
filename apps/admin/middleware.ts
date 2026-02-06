import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Rushingbot Admin"'
    }
  });
}

export function middleware(request: NextRequest) {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  // Keep login optional until credentials are configured in Railway.
  if (!adminUser || !adminPass) {
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const token = auth.slice(6);
    const decoded = atob(token);
    const splitIndex = decoded.indexOf(":");
    const user = splitIndex >= 0 ? decoded.slice(0, splitIndex) : "";
    const pass = splitIndex >= 0 ? decoded.slice(splitIndex + 1) : "";

    if (user === adminUser && pass === adminPass) {
      return NextResponse.next();
    }
  } catch {
    return unauthorized();
  }

  return unauthorized();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
