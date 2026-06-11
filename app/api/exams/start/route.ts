import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildExamPrompt, EXAM_SYSTEM_PROMPT, type ExamConfig } from "@/lib/prompts/exam-gen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your_deepseek_api_key_here") {
    return NextResponse.json({ error: "DeepSeek API Key 未配置" }, { status: 500 });
  }

  let body: ExamConfig & { userId: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "请求参数无效" }, { status: 400 });
  }

  const { userId, examType, subjects, questionTypes, difficulty, totalQuestions, durationMinutes } = body;
  if (!userId || !examType || !subjects?.length) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  const prompt = buildExamPrompt({ examType, subjects, questionTypes, difficulty, totalQuestions, durationMinutes });

  try {
    const aiRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [
          { role: "system", content: EXAM_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 8192,
        stream: false,
      }),
    });

    if (!aiRes.ok) {
      return NextResponse.json({ error: "AI 生成试卷失败" }, { status: 502 });
    }

    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json({ error: "AI 未返回内容" }, { status: 500 });

    let examData: { examTitle?: string; questions: Record<string, unknown>[] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      examData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "AI 返回格式异常" }, { status: 500 });
    }

    const questions = examData.questions || [];
    if (questions.length === 0) {
      return NextResponse.json({ error: "未生成到题目" }, { status: 500 });
    }

    // Ensure user profile exists (FK constraint)
    await db.userProfile.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {},
    });

    // Keep only last 10 exams — delete oldest if exceeded
    const examCount = await db.exam.count({ where: { userId } });
    if (examCount >= 10) {
      const oldExams = await db.exam.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        take: examCount - 9, // number to delete
        select: { id: true },
      });
      for (const old of oldExams) {
        await db.examAnswer.deleteMany({ where: { examId: old.id } });
        await db.exam.delete({ where: { id: old.id } });
      }
    }

    // Create exam record
    const exam = await db.exam.create({
      data: {
        userId,
        examType,
        subjectScope: subjects.join(","),
        totalQuestions: questions.length,
        durationMinutes: durationMinutes || Math.ceil(questions.length * 2),
        status: "in_progress",
        startedAt: new Date(),
      },
    });

    // Create questions and exam_answers
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const question = await db.question.create({
        data: {
          examType,
          subject: (q.subject as string) || subjects[0],
          type: (q.type as string) || "single_choice",
          difficulty: (q.difficulty as string) || difficulty,
          content: JSON.parse(JSON.stringify({
            stem: q.stem,
            options: q.options || [],
            answer: q.answer,
            analysis: q.analysis,
          })),
          knowledgePoints: (q.knowledgePoints as string[]) || [],
          userId: null,
          isPublic: false,
        },
      });

      await db.examAnswer.create({
        data: {
          examId: exam.id,
          questionId: question.id,
          questionOrder: i + 1,
          userAnswer: null,
          isCorrect: null,
          score: null,
        },
      });
    }

    return NextResponse.json({ exam: { id: exam.id, totalQuestions: questions.length, title: examData.examTitle || "模拟考试" } });
  } catch (err) {
    console.error("Exam start error:", err);
    return NextResponse.json({ error: "创建模考失败" }, { status: 500 });
  }
}
