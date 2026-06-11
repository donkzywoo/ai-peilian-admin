import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { completed } = await req.json();

  try {
    const task = await db.studyTask.update({
      where: { id },
      data: {
        completed: completed === true,
        completedAt: completed === true ? new Date() : null,
      },
    });
    return NextResponse.json({ task });
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
