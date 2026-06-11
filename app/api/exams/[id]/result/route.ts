import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        examAnswers: {
          include: { question: { select: { id: true, content: true, type: true, subject: true, knowledgePoints: true } } },
          orderBy: { questionOrder: "asc" },
        },
      },
    });

    if (!exam) return NextResponse.json({ error: "模考不存在" }, { status: 404 });

    return NextResponse.json({ exam });
  } catch (err) {
    console.error("Exam result error:", err);
    return NextResponse.json({ error: "获取成绩失败" }, { status: 500 });
  }
}
