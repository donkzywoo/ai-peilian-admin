import { NextRequest } from "next/server";
import { buildGradePrompt, GRADING_SYSTEM_PROMPT, type QuestionKind, type GradingResult } from "@/lib/prompts/answer-grade";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your_deepseek_api_key_here") {
    return new Response(JSON.stringify({ error: "DeepSeek API Key 未配置" }), { status: 500 });
  }

  let body: {
    kind: QuestionKind;
    stem: string;
    referenceAnswer: string;
    userAnswer: string;
    maxScore?: number;
    questionId?: string;
    userId?: string;
  };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "请求参数无效" }), { status: 400 });
  }

  const { kind, stem, referenceAnswer, userAnswer, maxScore, questionId, userId } = body;
  if (!stem || !referenceAnswer || !userAnswer) {
    return new Response(JSON.stringify({ error: "缺少必要参数" }), { status: 400 });
  }

  const prompt = buildGradePrompt({ kind, stem, referenceAnswer, userAnswer, maxScore });

  try {
    const aiResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [
          { role: "system", content: GRADING_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => "Unknown");
      return new Response(JSON.stringify({ error: `DeepSeek API ${aiResponse.status}` }), { status: 502 });
    }

    // Pipe SSE stream: forward raw chunks, parse JSON at the end
    const reader = aiResponse.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: "响应流为空" }), { status: 500 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            let extracted = "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) extracted += delta;
              } catch { /* skip */ }
            }

            if (extracted) {
              fullContent += extracted;
              // Send SSE event with the new text chunk
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ chunk: extracted })}\n\n`));
            }
          }

          // Parse final result
          let result: GradingResult;
          try {
            const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
            result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(fullContent);
          } catch {
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ error: "AI 返回格式异常，请重试" })}\n\n`
            ));
            controller.close();
            return;
          }

          // Save to database
          let answerRecordId: string | null = null;
          if (questionId && userId) {
            // Ensure user profile exists
            await db.userProfile.upsert({
              where: { id: userId },
              create: { id: userId },
              update: {},
            }).catch(() => {});
            try {
              const record = await db.answerRecord.create({
                data: {
                  userId,
                  questionId,
                  userAnswer,
                  score: result.totalScore,
                  feedback: JSON.parse(JSON.stringify(result)),
                  isCorrect: result.totalScore >= (result.maxScore * 0.6),
                  timeSpent: null,
                },
              });
              answerRecordId = record.id;

              // Auto-add to wrong-book if score < 60%
              if (result.totalScore < result.maxScore * 0.6) {
                await db.wrongQuestion.create({
                  data: {
                    userId,
                    answerRecordId: record.id,
                    nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day later
                  },
                });
              }
            } catch (dbErr) {
              console.error("Failed to save answer record:", dbErr);
            }
          }

          // Send final result
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ done: true, result, answerRecordId })}\n\n`
          ));
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ error: "批改过程出错" })}\n\n`
          ));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("Grading error:", err);
    return new Response(JSON.stringify({ error: "批改失败" }), { status: 500 });
  }
}
