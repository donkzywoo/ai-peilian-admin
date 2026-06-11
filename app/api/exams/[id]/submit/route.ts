import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { answers: Record<string, string> };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "请求参数无效" }, { status: 400 });
  }

  const { answers } = body;

  try {
    const exam = await db.exam.findUnique({ where: { id } });
    if (!exam) return NextResponse.json({ error: "模考不存在" }, { status: 404 });
    if (exam.status !== "in_progress") return NextResponse.json({ error: "模考已结束" }, { status: 400 });

    const examAnswers = await db.examAnswer.findMany({
      where: { examId: id },
      include: { question: { select: { id: true, content: true, type: true, knowledgePoints: true, subject: true } } },
      orderBy: { questionOrder: "asc" },
    });

    let totalScore = 0;
    let maxScore = 0;
    const results: Record<string, unknown>[] = [];

    for (const ea of examAnswers) {
      const userAnswer = answers[ea.questionId] || "";
      const qContent = ea.question.content as Record<string, unknown>;
      const correctAnswer = qContent.answer as string;
      const qType = ea.question.type;
      const isChoice = qType === "single_choice" || qType === "multi_choice";

      let score = 0;
      let isCorrect: boolean | null = null;

      if (isChoice) {
        // Auto-grade choice questions
        const qScore = qType === "single_choice" ? 2 : 4; // 单选2分，多选4分
        maxScore += qScore;
        const correctStr = String(correctAnswer || "").trim().toUpperCase();
        if (qType === "multi_choice") {
          // Multi-choice: compare sorted sets
          const userKeys = userAnswer.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean).sort().join("");
          const correctKeys = correctStr.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean).sort().join("");
          isCorrect = userKeys === correctKeys;
        } else {
          isCorrect = userAnswer.trim().toUpperCase() === correctStr;
        }
        if (isCorrect) {
          score = qScore;
          totalScore += qScore;
        }
      } else {
        // Subjective — marked as pending AI grading for now
        const qScore = qType === "short_answer" ? 5 : 15; // 简答5分，论述15分
        maxScore += qScore;
        isCorrect = null;
        score = 0; // Will be graded separately
      }

      results.push({
        questionId: ea.questionId,
        type: qType,
        stem: qContent.stem,
        options: qContent.options,
        userAnswer,
        correctAnswer,
        isCorrect,
        score,
        maxScore: isChoice ? (qType === "single_choice" ? 2 : 4) : (qType === "short_answer" ? 5 : 15),
        analysis: qContent.analysis,
        knowledgePoints: ea.question.knowledgePoints || [],
        subject: ea.question.subject,
      });

      // Update exam answer record
      await db.examAnswer.update({
        where: { id: ea.id },
        data: { userAnswer, isCorrect, score },
      });
    }

    // Update exam status
    await db.exam.update({
      where: { id },
      data: {
        status: "graded",
        submittedAt: new Date(),
        totalScore,
        report: JSON.parse(JSON.stringify({ results, totalScore, maxScore, autoGraded: true, pendingAI: results.filter(r => r.isCorrect === null).length })),
      },
    });

    return NextResponse.json({
      totalScore,
      maxScore,
      results,
    });
  } catch (err) {
    console.error("Exam submit error:", err);
    return NextResponse.json({ error: "交卷失败" }, { status: 500 });
  }
}
