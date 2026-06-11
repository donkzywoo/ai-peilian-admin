import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  let query = SUPABASE_URL + "/rest/v1/support_messages?select=*&order=created_at.desc&limit=50";
  if (status) query += `&status=eq.${status}`;

  const res = await fetch(query, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const data = await res.json();
  return NextResponse.json({ messages: Array.isArray(data) ? data : [] });
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, reply, status } = await req.json();
    const body: Record<string, unknown> = { status: status || "replied" };
    if (reply) body.reply = reply;
    if (reply || status === "replied") body.replied_at = new Date().toISOString();

    await fetch(`${SUPABASE_URL}/rest/v1/support_messages?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
