import { NextRequest } from "next/server";
import {
  buildQuestionGenPrompt,
  SYSTEM_PROMPT,
  type QuestionGenParams,
} from "@/lib/prompts/question-gen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your_deepseek_api_key_here") {
    return new Response(
      JSON.stringify({ error: "DeepSeek API Key 未配置" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let params: QuestionGenParams;
  try {
    const body = await req.json();
    params = body as QuestionGenParams;
  } catch {
    return new Response(JSON.stringify({ error: "请求参数无效" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const prompt = buildQuestionGenPrompt(params);

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown");
      return new Response(
        JSON.stringify({ error: `DeepSeek API ${response.status}: ${errText}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Pipe the SSE stream directly to the client
    const readableStream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("Question generation error:", err);
    return new Response(
      JSON.stringify({ error: "生成失败，请稍后重试" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
