import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your_deepseek_api_key_here") {
    return NextResponse.json({ error: "DeepSeek API Key 未配置" }, { status: 500 });
  }

  const { userId, examType, subjects, examDate, dailyHours } = await req.json();
  if (!userId) return NextResponse.json({ error: "需要 userId" }, { status: 400 });

  const daysUntilExam = examDate
    ? Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / (86400000)))
    : 90;

  const prompt = `你是一位专业的${examType === "kaoyan" ? "考研" : "考公"}备考规划师。请为用户制定一个详细的复习计划。

用户情况：
- 考试类型：${examType === "kaoyan" ? "考研" : "考公"}
- 科目：${subjects?.join("、") || "全部科目"}
- 距离考试：约 ${daysUntilExam} 天
- 每天可学习：${dailyHours || 4} 小时

请制定一个分阶段复习计划，输出JSON格式：

{
  "phases": [
    {
      "name": "阶段名称",
      "duration": "第1-30天",
      "description": "阶段目标和重点",
      "tasks": [
        { "subject": "科目", "task": "具体任务描述", "estimatedMinutes": 60, "priority": "high" }
      ]
    }
  ],
  "dailySchedule": [
    { "timeBlock": "8:00-10:00", "activity": "数学刷题", "subject": "数学" }
  ]
}`;

  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [
          { role: "system", content: "你是备考规划专家，输出纯JSON。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.7, max_tokens: 4096, stream: false,
      }),
    });
    if (!res.ok) return NextResponse.json({ error: "AI 生成失败" }, { status: 502 });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    let planData: Record<string, unknown>;
    try {
      const m = content.match(/\{[\s\S]*\}/);
      planData = m ? JSON.parse(m[0]) : JSON.parse(content);
    } catch { return NextResponse.json({ error: "AI 格式异常" }, { status: 500 }); }

    // Ensure user profile
    await db.userProfile.upsert({ where: { id: userId }, create: { id: userId }, update: {} }).catch(() => {});

    // Delete old plan
    await db.studyTask.deleteMany({ where: { plan: { userId } } }).catch(() => {});
    await db.studyPlan.deleteMany({ where: { userId } }).catch(() => {});

    // Save new plan
    const plan = await db.studyPlan.create({
      data: { userId, planData: JSON.parse(JSON.stringify(planData)) },
    });

    // Create daily tasks from phases
    const phases = (planData.phases as Record<string, unknown>[]) || [];
    const today = new Date();
    let taskCount = 0;

    for (const phase of phases) {
      const tasks = (phase.tasks as Record<string, unknown>[]) || [];
      for (const task of tasks) {
        for (let d = 0; d < Math.min(30, daysUntilExam); d++) {
          const taskDate = new Date(today);
          taskDate.setDate(taskDate.getDate() + d);
          await db.studyTask.create({
            data: {
              planId: plan.id,
              date: taskDate,
              subject: (task.subject as string) || "",
              taskDescription: (task.task as string) || "",
              estimatedMinutes: (task.estimatedMinutes as number) || 60,
              completed: false,
            },
          });
          taskCount++;
          if (taskCount > 100) break; // Limit tasks
        }
        if (taskCount > 100) break;
      }
      if (taskCount > 100) break;
    }

    return NextResponse.json({ plan, planData, tasksCreated: taskCount });
  } catch (err) {
    console.error("Study plan error:", err);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
