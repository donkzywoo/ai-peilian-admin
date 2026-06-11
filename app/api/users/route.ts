import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return NextResponse.json({ error: "未配置 service_role key" }, { status: 500 });

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
