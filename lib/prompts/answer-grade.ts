/**
 * Prompt templates for AI answer grading.
 */

export type QuestionKind = "short_answer" | "essay";

export interface GradingDimension {
  name: string;
  score: number;
  maxScore: number;
  comment: string;
}

export interface GradingResult {
  totalScore: number;
  maxScore: number;
  dimensions: GradingDimension[];
  overallComment: string;
  deductions: { point: string; score: number }[];
  suggestions: string[];
  weakPoints: string[];
}

const DIMENSIONS = {
  essay: [
    { name: "准确性", weight: 40 },
    { name: "完整性", weight: 25 },
    { name: "逻辑性", weight: 20 },
    { name: "表达规范", weight: 15 },
  ],
  short_answer: [
    { name: "准确性", weight: 55 },
    { name: "完整性", weight: 30 },
    { name: "表达规范", weight: 15 },
  ],
};

export function buildGradePrompt(params: {
  kind: QuestionKind;
  stem: string;
  referenceAnswer: string;
  userAnswer: string;
  maxScore?: number;
}): string {
  const { kind, stem, referenceAnswer, userAnswer, maxScore = kind === "essay" ? 30 : 10 } = params;
  const dims = DIMENSIONS[kind];
  const dimList = dims.map((d) => `  - ${d.name}（权重${d.weight}%，满分${Math.round(maxScore * d.weight / 100)}分）`).join("\n");

  return `你是一位严格的阅卷老师。请批改以下学生的答案。

【题目】${stem}
【参考答案】${referenceAnswer}
【满分】${maxScore} 分
【学生答案】${userAnswer}

评分维度（满分${maxScore}分）：
${dimList}

要求：
1. 按维度分别给分，给出简短评语（1句话，指出该维度的优缺点）
2. 给出总分
3. 给出整体评价（1-2句话概括）
4. 列出具体扣分点（每条说明扣分原因和扣分值，扣分总和 = maxScore - totalScore）
5. 列出2-4条具体改进建议，按优先级排序
6. 指出0-3个相关知识薄弱点

输出严格JSON格式，不要包含任何额外文字：

{
  "totalScore": (数字),
  "maxScore": ${maxScore},
  "dimensions": [
    { "name": "准确性", "score": (得分), "maxScore": (该维度满分), "comment": "该维度的简短评语" },
    { "name": "完整性", "score": (得分), "maxScore": (该维度满分), "comment": "该维度的简短评语" },
    ...
  ],
  "overallComment": "整体评价，1-2句话",
  "deductions": [
    { "point": "扣分原因描述", "score": (扣分值) }
  ],
  "suggestions": ["建议1按优先级排列", "建议2"],
  "weakPoints": ["薄弱知识点的名称"]
}`;
}

export const GRADING_SYSTEM_PROMPT = `你是一位资深考试阅卷老师。你的任务是根据参考答案批改学生的主观题答案。
你必须始终：
1. 输出纯JSON格式，不包含任何markdown标记或额外文字
2. 严格遵循指定的JSON schema
3. 评分公正严格，既肯定优点也指出不足
4. 扣分点明确具体，让同学知道每分扣在哪里
5. 改进建议具体可行，不说空话
6. 中文作答`;
