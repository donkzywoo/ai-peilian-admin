import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const deckName = searchParams.get("deck");
  const due = searchParams.get("due"); // "true" = only cards due for review

  if (!userId) return NextResponse.json({ error: "需要 userId" }, { status: 400 });

  const where: Record<string, unknown> = { userId };
  if (deckName) where.deckName = deckName;
  if (due === "true") where.nextReviewAt = { lte: new Date() };

  try {
    const cards = await db.flashcard.findMany({
      where,
      orderBy: { nextReviewAt: "asc" },
      take: 200,
    });

    // Get distinct decks
    const decks = await db.flashcard.groupBy({
      by: ["deckName"],
      where: { userId },
      _count: { id: true },
    });

    return NextResponse.json({
      cards,
      decks: decks.map((d) => ({ name: d.deckName, count: d._count.id })),
    });
  } catch (err) {
    console.error("Flashcards error:", err);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
