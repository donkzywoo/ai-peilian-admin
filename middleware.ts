import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // 方式1：代理请求，有 x-api-secret
    const secret = request.headers.get("x-api-secret");
    if (secret === (process.env.API_SECRET || "dev-secret")) {
      return NextResponse.next();
    }

    // 方式2：浏览器请求。只放行 admin-check/stats/users/admin-support 这四个管理API
    const allowedPaths = ["/api/admin-check", "/api/stats", "/api/users", "/api/admin-support"];
    const isAllowedAdminApi = allowedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

    if (isAllowedAdminApi) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll(); },
            setAll() {},
          },
        }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const admins = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
        if (admins.includes(user.email.toLowerCase())) {
          return NextResponse.next();
        }
      }
    }

    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
