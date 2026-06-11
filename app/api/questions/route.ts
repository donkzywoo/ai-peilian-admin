import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examType = searchParams.get("examType");
    const subject = searchParams.get("subject");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "20"), 50);

    const where: Record<string, unknown> = {};
    const userId = searchParams.get("userId");
    if (examType) where.examType = examType;
    if (subject) where.subject = subject;
    // When userId specified, only return that user's manually saved questions
    // (exam questions have userId=null and won't match)
    if (userId) {
      where.userId = userId;
    } else {
      // Without userId, exclude exam-generated questions
      where.userId = { not: null };
    }

    const [questions, total] = await Promise.all([
      db.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.question.count({ where }),
    ]);

    return NextResponse.json({
      questions,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error("Get questions error:", err);
    return NextResponse.json(
      { error: "获取题目失败" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = await db.question.create({
      data: {
        examType: body.examType,
        subject: body.subject,
        chapter: body.chapter ?? null,
        type: body.type,
        difficulty: body.difficulty,
        content: body.content,
        knowledgePoints: body.knowledgePoints ?? [],
        isPublic: body.isPublic ?? false,
        userId: body.userId ?? null,
      },
    });
    return NextResponse.json({ question }, { status: 201 });
  } catch (err) {
    console.error("Create question error:", err);
    return NextResponse.json(
      { error: "保存题目失败" },
      { status: 500 }
    );
  }
}
