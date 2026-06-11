/**
 * Prompt templates for AI question generation.
 */

export type ExamType = "kaoyan" | "kaogong";
export type QuestionSubject =
  | "政治"
  | "英语"
  | "数学"
  | "行测"
  | "申论";
export type QuestionType =
  | "single_choice"
  | "multi_choice"
  | "short_answer"
  | "essay";
export type Difficulty = "easy" | "medium" | "hard";

export interface QuestionGenParams {
  examType: ExamType;
  subject: QuestionSubject;
  chapter?: string;
  type: QuestionType;
  difficulty: Difficulty;
  count: number;
}

const EXAM_LABELS: Record<ExamType, string> = {
  kaoyan: "考研",
  kaogong: "考公",
};

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "单选题（4个选项，含3个干扰项）",
  multi_choice: "多选题（4个选项，含2-3个正确选项）",
  short_answer: "简答题（短答案，50-200字作答）",
  essay: "论述题（长答案，200-800字作答）",
};

export function buildQuestionGenPrompt(params: QuestionGenParams): string {
  const { examType, subject, chapter, type, difficulty, count } = params;
  const diffLabel =
    difficulty === "easy" ? "基础" : difficulty === "medium" ? "中等" : "较难";

  return `你是一位资深的${EXAM_LABELS[examType]}命题专家。请根据以下要求生成题目：

考试类型：${EXAM_LABELS[examType]}
科目：${subject}
${chapter ? `章节/知识点：${chapter}` : ""}
题型：${TYPE_LABELS[type]}
难度：${diffLabel}
数量：${count} 道

要求：
1. 题目表述清晰，严格符合${EXAM_LABELS[examType]}真题风格
2. 每道题附带标准答案和详细解析
3. 对于选择题，额外生成有迷惑性的干扰项
4. 输出为严格的JSON格式，不要包含任何额外文字

请按照如下JSON schema输出：
{
  "questions": [{
    "type": "${type}",
    "stem": "题目内容",
    "options": [{"key": "A", "content": "选项A内容"}, {"key": "B", "content": "选项B内容"}, {"key": "C", "content": "选项C内容"}, {"key": "D", "content": "选项D内容"}],
    "answer": "正确答案（选择题填key如A，简答/论述填标准答案文本）",
    "analysis": "详细解析，说明解题思路和考察的知识点",
    "knowledgePoints": ["知识点1", "知识点2"],
    "difficulty": "${difficulty}"
  }]
}

注意：options 字段仅在 type 为 single_choice 或 multi_choice 时需要。对于 short_answer 和 essay，options 应为空数组 [].

现在请生成 ${count} 道${EXAM_LABELS[examType]}${subject}${diffLabel}难度${TYPE_LABELS[type]}：`;
}

/**
 * System prompt that sets up the AI's role.
 */
export const SYSTEM_PROMPT = `你是中国考研和考公领域的资深命题专家。你的任务是根据要求生成高质量的模拟试题。
你必须始终：
1. 输出纯JSON格式，不包含任何markdown标记或额外文字
2. 严格遵循指定的JSON schema
3. 题目贴近真实考试风格和难度
4. 解析详细准确，指出考察的知识点
5. 选择题的干扰项要有真正的迷惑性
6. 所有数学公式使用LaTeX格式：行内公式用 $...$，独立公式用 $$...$$。例如：$\int_{a}^{b} f(x)dx$、$\lim_{x \to \infty}$、$\frac{dy}{dx}$、$\sum_{n=1}^{\infty}$`;
