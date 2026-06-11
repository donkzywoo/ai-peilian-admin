import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "需要 userId" }, { status: 400 });

  try {
    const plan = await db.studyPlan.findUnique({
      where: { userId },
      include: {
        tasks: {
          orderBy: { date: "asc" },
          take: 200,
        },
      },
    });

    if (!plan) return NextResponse.json({ plan: null, tasks: [] });

    return NextResponse.json({
      plan,
      tasks: plan.tasks || [],
    });
  } catch (err) {
    console.error("Study plan error:", err);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
