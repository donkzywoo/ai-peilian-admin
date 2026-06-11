import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete related records in correct order (respect FK constraints)
    // 1. Delete wrong_questions linked via answer_records
    const answerRecords = await db.answerRecord.findMany({
      where: { questionId: id },
      select: { id: true },
    });
    for (const ar of answerRecords) {
      await db.wrongQuestion.deleteMany({ where: { answerRecordId: ar.id } });
    }

    // 2. Delete answer_records
    await db.answerRecord.deleteMany({ where: { questionId: id } });

    // 3. Delete exam_answers
    await db.examAnswer.deleteMany({ where: { questionId: id } });

    // 4. Delete the question itself
    await db.question.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete question error:", err);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
