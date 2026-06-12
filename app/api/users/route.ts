import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkAdminAuth } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  console.log("[api/users] 进入了 route handler");
  console.log("[api/users] API_SECRET 是否配置:", !!process.env.API_SECRET);
  console.log("[api/users] x-api-secret 请求头:", req.headers.get("x-api-secret") || "(无)");
  if (req.headers.get("x-api-secret") !== (process.env.API_SECRET || "dev-secret")) {
    const isAdmin = await checkAdminAuth(await cookies());
    if (!isAdmin) return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return NextResponse.json({ error: "未配置" }, { status: 500 });

  const res = await fetch(`${url}/auth/v1/admin/users?per_page=100`, {
    headers: { Authorization: `Bearer ${key}`, apikey: key },
  });
  if (!res.ok) return NextResponse.json({ error: "获取用户失败" }, { status: 500 });

  const data = await res.json();
  const users = (data.users || data || []).map((u: Record<string, unknown>) => ({
    id: u.id, email: u.email,
    createdAt: u.created_at, lastSignIn: u.last_sign_in_at,
    confirmed: u.email_confirmed_at != null,
  }));
  return NextResponse.json({ users, total: users.length });
}
