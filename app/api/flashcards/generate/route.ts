import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const SYSTEM_PROMPT = `你是知识闪卡生成专家。将知识点转化为问答形式的闪卡。`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your_deepseek_api_key_here") {
    return NextResponse.json({ error: "DeepSeek API Key 未配置" }, { status: 500 });
  }

  const { userId, subject, chapter, count = 10 } = await req.json();
  if (!userId || !subject) return NextResponse.json({ error: "缺少参数" }, { status: 400 });

  const prompt = `请为以下知识点生成 ${count} 张闪卡：
科目：${subject}${chapter ? `，章节：${chapter}` : ""}

每张闪卡包含正面（问题/概念）和背面（答案/解释）。要求：
1. 正面简洁明了，适合快速回忆
2. 背面给出准确、完整的解释
3. 涵盖核心概念、公式、定义、重要日期/事件等
4. 输出严格JSON格式

{
  "deckName": "卡组名称",
  "cards": [
    { "front": "问题/概念", "back": "答案/解释" }
  ]
}`;

  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
        temperature: 0.7, max_tokens: 4096, stream: false,
      }),
    });
    if (!res.ok) return NextResponse.json({ error: "AI 生成失败" }, { status: 502 });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    let parsed: { deckName?: string; cards: { front: string; back: string }[] };
    try {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : JSON.parse(content);
    } catch { return NextResponse.json({ error: "格式异常" }, { status: 500 }); }

    const deckName = parsed.deckName || `${subject}闪卡`;

    // Ensure user profile
    await db.userProfile.upsert({ where: { id: userId }, create: { id: userId }, update: {} }).catch(() => {});

    const cards = [];
    for (const c of parsed.cards) {
      const card = await db.flashcard.create({
        data: { userId, deckName, frontContent: c.front, backContent: c.back },
      });
      cards.push(card);
    }

    return NextResponse.json({ deckName, cards, count: cards.length });
  } catch (err) {
    console.error("Flashcard gen error:", err);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
