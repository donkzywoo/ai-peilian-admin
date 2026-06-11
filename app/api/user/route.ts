import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "需要 userId" }, { status: 400 });

  try {
    const profile = await db.userProfile.findUnique({ where: { id: userId } });
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, nickname, examType, examDate, dailyStudyHours, targetSchool, targetMajor, avatarUrl } = await req.json();
    if (!userId) return NextResponse.json({ error: "需要 userId" }, { status: 400 });

    const profile = await db.userProfile.upsert({
      where: { id: userId },
      create: {
        id: userId,
        nickname: nickname || null,
        examType: examType || null,
        examDate: examDate ? new Date(examDate) : null,
        dailyStudyHours: dailyStudyHours || 4,
        targetSchool: targetSchool || null,
        targetMajor: targetMajor || null,
        avatarUrl: avatarUrl || null,
      },
      update: {
        nickname: nickname || null,
        examType: examType || null,
        examDate: examDate ? new Date(examDate) : null,
        dailyStudyHours: dailyStudyHours || 4,
        targetSchool: targetSchool || null,
        targetMajor: targetMajor || null,
        avatarUrl: avatarUrl || null,
      },
    });

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
