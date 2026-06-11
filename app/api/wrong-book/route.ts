import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "20"), 50);

    if (!userId) {
      return NextResponse.json({ error: "需要 userId 参数" }, { status: 400 });
    }

    const where: Record<string, unknown> = { userId };
    const mastered = searchParams.get("mastered");
    if (mastered === "true") where.mastered = true;
    else if (mastered === "false") where.mastered = false;

    const [records, total] = await Promise.all([
      db.wrongQuestion.findMany({
        where,
        orderBy: { nextReviewAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          answerRecord: {
            select: {
              userAnswer: true,
              score: true,
              question: { select: { id: true, content: true, subject: true } },
            },
          },
        },
      }),
      db.wrongQuestion.count({ where }),
    ]);

    return NextResponse.json({
      records,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error("Wrong book error:", err);
    return NextResponse.json({ error: "获取错题本失败" }, { status: 500 });
  }
}
