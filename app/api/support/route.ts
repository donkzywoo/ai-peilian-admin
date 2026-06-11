import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "100"), 200);

  if (!userId) return NextResponse.json({ error: "需要 userId" }, { status: 400 });

  try {
    const where = { userId } as Record<string, unknown>;
    const [messages, total, unreadCount] = await Promise.all([
      db.supportMessage.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.supportMessage.count({ where }),
      db.supportMessage.count({ where: { userId, sender: "admin", isRead: false } }),
    ]);

    return NextResponse.json({ messages, total, unreadCount });
  } catch (err) {
    console.error("Support error:", err);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, message } = await req.json();
    if (!userId || userId === "undefined" || !message) return NextResponse.json({ error: "请先登录" }, { status: 400 });

    const msg = await db.supportMessage.create({
      data: { userId, userEmail: userEmail || "", message, sender: "user", isRead: false, status: "open" },
    });
    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (err) {
    console.error("Support create error:", err);
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}
