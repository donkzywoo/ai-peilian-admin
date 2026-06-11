import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 });

    await db.supportMessage.updateMany({
      where: { userId, sender: "admin", isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
