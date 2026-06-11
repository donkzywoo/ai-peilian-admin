/**
 * Prompt template for generating a complete exam paper.
 */

import type { ExamType, QuestionSubject, Difficulty, QuestionType } from "./question-gen";

export interface ExamConfig {
  examType: ExamType;
  subjects: QuestionSubject[];
  questionTypes: QuestionType[];
  difficulty: Difficulty;
  totalQuestions: number;
  durationMinutes: number;
}

export function buildExamPrompt(config: ExamConfig): string {
  const { examType, subjects, questionTypes, difficulty, totalQuestions } = config;
  const examLabel = examType === "kaoyan" ? "考研" : "考公";
  const subjectList = subjects.join("、");
  const typeList = questionTypes.join("、");
  const diffLabel = difficulty === "easy" ? "基础" : difficulty === "medium" ? "中等" : "较难";

  return `你是一位资深的${examLabel}命题专家。请生成一套完整的模拟考试试卷。

考试类型：${examLabel}
科目范围：${subjectList}
题型：${typeList}
难度：${diffLabel}
总题量：${totalQuestions} 道

要求：
1. 题目分配合理，覆盖指定的科目范围
2. 题型按比例分配（选择题约占60%，简答/论述约占40%）
3. 每道题标注所属科目(subject)和知识点(knowledgePoints)
4. 选择题生成4个选项，含正确答案和3个干扰项
5. 每道题附带标准答案和详细解析
6. 输出严格JSON格式，不要包含任何额外文字

{
  "examTitle": "模拟考试标题（如：2026考研政治模拟卷）",
  "questions": [
    {
      "type": "single_choice",
      "subject": "政治",
      "stem": "题目内容",
      "options": [{"key": "A", "content": "选项A"}, {"key": "B", "content": "选项B"}, {"key": "C", "content": "选项C"}, {"key": "D", "content": "选项D"}],
      "answer": "A",
      "analysis": "详细解析",
      "knowledgePoints": ["知识点1"],
      "difficulty": "medium"
    },
    {
      "type": "short_answer",
      "subject": "政治",
      "stem": "简答题内容",
      "options": [],
      "answer": "参考答案",
      "analysis": "详细解析",
      "knowledgePoints": ["知识点1"],
      "difficulty": "medium"
    }
  ]
}`;
}

export const EXAM_SYSTEM_PROMPT = `你是中国考研和考公领域的资深命题专家。你的任务是根据要求生成完整的模拟考试试卷。
你必须始终：
1. 输出纯JSON格式，不包含任何markdown标记或额外文字
2. 严格遵循指定的JSON schema
3. 题目贴近真实考试风格和难度
4. 解析详细准确，指出考察的知识点
5. 选择题的干扰项要有真正的迷惑性
6. 所有数学公式使用LaTeX格式：行内公式用 $...$，独立公式用 $$...$$。例如：$\int_{a}^{b} f(x)dx$、$\lim_{x \to \infty}$、$\frac{dy}{dx}$`;
