import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "20"), 50);

  if (!userId) return NextResponse.json({ error: "需要 userId" }, { status: 400 });

  try {
    const where = { userId };
    const [exams, total] = await Promise.all([
      db.exam.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { examAnswers: true } } },
      }),
      db.exam.count({ where }),
    ]);

    return NextResponse.json({
      exams,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error("Exams list error:", err);
    return NextResponse.json({ error: "获取模考列表失败" }, { status: 500 });
  }
}
