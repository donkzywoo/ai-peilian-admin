import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { wrongId, mastered, quality } = await req.json();
    if (!wrongId) return NextResponse.json({ error: "缺少 wrongId" }, { status: 400 });

    const wq = await db.wrongQuestion.findUnique({ where: { id: wrongId } });
    if (!wq) return NextResponse.json({ error: "错题不存在" }, { status: 404 });

    const q = quality ?? (mastered ? 4 : 1);
    let reviewCount = wq.reviewCount + 1;
    const isMastered = mastered === true || reviewCount >= 3;

    // Simple spaced intervals: 1, 3, 7, 14, 30 days
    const intervals = [1, 3, 7, 14, 30];
    const intervalDays = isMastered ? 30 : (intervals[Math.min(reviewCount - 1, intervals.length - 1)] || 7);
    const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

    await db.wrongQuestion.update({
      where: { id: wrongId },
      data: { reviewCount, nextReviewAt, mastered: isMastered },
    });

    return NextResponse.json({ success: true, mastered: isMastered, nextReviewAt, intervalDays });
  } catch (err) {
    console.error("Review error:", err);
    return NextResponse.json({ error: "记录失败" }, { status: 500 });
  }
}
