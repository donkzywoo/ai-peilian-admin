import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return NextResponse.json({ error: "未配置 service_role key" }, { status: 500 });

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  // This is a simplified approach — we use Supabase's built-in features
  const [
    { count: userCount },
    { count: questionCount },
    { count: answerCount },
    { count: wrongCount },
  ] = await Promise.all([
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
