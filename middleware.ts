import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    console.log("[middleware] ====== 请求进入 ======");
    console.log("[middleware] 请求路径:", request.nextUrl.pathname);

    // 方式1：代理请求，有 x-api-secret
    const secret = request.headers.get("x-api-secret");
    console.log("[middleware] x-api-secret:", secret ? `${secret.substring(0, 8)}...` : "(无)");

    const expectedSecret = process.env.API_SECRET || "dev-secret";
    const secretMatch = secret === expectedSecret;
    console.log("[middleware] secret 匹配:", secretMatch);

    if (secretMatch) {
      console.log("[middleware] ✅ 代理请求放行");
      return NextResponse.next();
    }

    // 方式2：浏览器请求。只放行 admin-check/stats/users/admin-support 这四个管理API
    const allowedPaths = ["/api/admin-check", "/api/stats", "/api/users", "/api/admin-support"];
    const isAllowedAdminApi = allowedPaths.some((p) => request.nextUrl.pathname.startsWith(p));
    console.log("[middleware] 是否后台管理接口:", isAllowedAdminApi);

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
      console.log("[middleware] Supabase 用户:", user ? { id: user.id, email: user.email } : "(未登录)");

      if (user?.email) {
        const rawAdmins = process.env.ADMIN_EMAILS || "";
        const admins = rawAdmins.split(",").map((e) => e.trim().toLowerCase());
        const loweredEmail = user.email.toLowerCase();
        const isInWhitelist = admins.includes(loweredEmail);

        console.log("[middleware] 管理员白名单(原始):", rawAdmins);
        console.log("[middleware] 管理员白名单(数组):", admins);
        console.log("[middleware] 用户邮箱(小写):", loweredEmail);
        console.log("[middleware] 邮箱命中白名单:", isInWhitelist);

        if (isInWhitelist) {
          console.log("[middleware] ✅ 管理员身份放行");
          return NextResponse.next();
        }
        console.log("[middleware] ❌ 邮箱不在白名单");
      } else {
        console.log("[middleware] ❌ 无用户邮箱");
      }
    }

    console.log("[middleware] ❌ 返回 401 未授权");
    console.log("[middleware] ====== 请求结束 ======");
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
