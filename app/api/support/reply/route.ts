import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, message } = await req.json();
    if (!userId || userId === "undefined" || !message) return NextResponse.json({ error: "请先登录" }, { status: 400 });

    const msg = await db.supportMessage.create({
      data: { userId, userEmail: userEmail || "", message, sender: "admin", isRead: false, status: "open" },
    });

    // Also mark the conversation as open
    await db.supportMessage.updateMany({
      where: { userId, status: "closed" },
      data: { status: "open" },
    });

    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (err) {
    console.error("Reply error:", err);
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}
