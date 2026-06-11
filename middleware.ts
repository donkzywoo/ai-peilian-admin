import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const secret = request.headers.get("x-api-secret");
    if (secret !== (process.env.API_SECRET || "dev-secret")) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
