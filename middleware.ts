import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 后台管理接口：直接放行，由各 route handler 自行校验管理员身份
  const adminApis = ["/api/admin-check", "/api/stats", "/api/users", "/api/admin-support"];
  if (adminApis.some((p) => request.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 其他 /api/* 接口：必须有 x-api-secret
  const secret = request.headers.get("x-api-secret");
  if (secret === (process.env.API_SECRET || "dev-secret")) {
    return NextResponse.next();
  }

  return NextResponse.json({ error: "未授权" }, { status: 401 });
}

export const config = {
  matcher: "/api/:path*",
};
