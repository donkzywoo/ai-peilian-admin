import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { quality } = await req.json(); // 0-5 SM-2 quality

  try {
    const card = await db.flashcard.findUnique({ where: { id } });
    if (!card) return NextResponse.json({ error: "不存在" }, { status: 404 });

    const q = quality ?? 3;
    let { reviewCount } = card;
    let intervalDays = Number(card.intervalDays);
    let easeFactor = Number(card.easeFactor);

    if (q >= 3) {
      reviewCount += 1;
      if (reviewCount === 1) intervalDays = 1;
      else if (reviewCount === 2) intervalDays = 6;
      else intervalDays = Math.round(intervalDays * easeFactor);
      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    } else {
      reviewCount = 0; intervalDays = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

    await db.flashcard.update({
      where: { id },
      data: { reviewCount, easeFactor, intervalDays, nextReviewAt },
    });

    return NextResponse.json({ success: true, nextReviewAt, intervalDays });
  } catch (err) {
    console.error("Review error:", err);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
