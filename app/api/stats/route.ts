import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { checkAdminAuth } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  console.log("[api/stats] 进入了 route handler");
  // Also accept x-api-secret (from user app proxy)
  if (req.headers.get("x-api-secret") !== (process.env.API_SECRET || "dev-secret")) {
    const isAdmin = await checkAdminAuth(await cookies());
    if (!isAdmin) return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return NextResponse.json({ error: "未配置" }, { status: 500 });

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const [{ count: userCount }, { count: questionCount }, { count: answerCount }, { count: wrongCount }] =
    await Promise.all([
      supabase.from("user_profiles").select("*", { count: "exact", head: true }),
      supabase.from("questions").select("*", { count: "exact", head: true }),
      supabase.from("answer_records").select("*", { count: "exact", head: true }),
      supabase.from("wrong_questions").select("*", { count: "exact", head: true }),
    ]);

  return NextResponse.json({
    users: userCount ?? 0,
    questions: questionCount ?? 0,
    answers: answerCount ?? 0,
    wrongQuestions: wrongCount ?? 0,
  });
}
