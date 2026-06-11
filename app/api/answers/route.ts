import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const questionId = searchParams.get("questionId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "20"), 50);

    if (!userId) {
      return NextResponse.json({ error: "需要 userId 参数" }, { status: 400 });
    }

    const where: Record<string, unknown> = { userId };
    if (questionId) where.questionId = questionId;

    const [records, total] = await Promise.all([
      db.answerRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          question: { select: { id: true, content: true, type: true, subject: true } },
          wrongQuestion: { select: { id: true, mastered: true } },
        },
      }),
      db.answerRecord.count({ where }),
    ]);

    return NextResponse.json({
      records,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error("Get answers error:", err);
    return NextResponse.json({ error: "获取批改记录失败" }, { status: 500 });
  }
}
