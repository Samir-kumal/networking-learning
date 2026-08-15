// Pure grading logic — no DB, no framework. Kept separate from service.ts so it's
// trivially unit-testable and reusable by anything that needs to grade a quiz
// (e.g. a future admin preview) without a live database.
import type { QuestionKind } from "@/lib/ml/quizzes/types";

export interface GradableQuestion {
  id: string;
  kind: QuestionKind;
  correctAnswer: string | number;
  tolerance: number | null;
  explanation: string;
}

export interface GradedQuestion {
  questionId: string;
  correct: boolean;
  explanation: string;
}

export interface GradeResult {
  score: number; // 0..1
  passed: boolean;
  results: GradedQuestion[];
}

/** MCQ: exact string match. numeric/slider-match: within `tolerance` of the target. */
function isCorrectAnswer(question: GradableQuestion, given: string | number | undefined): boolean {
  if (given === undefined) return false;
  if (question.kind === "mcq") {
    return typeof given === "string" && given === question.correctAnswer;
  }
  const target = Number(question.correctAnswer);
  const value = Number(given);
  const tolerance = question.tolerance ?? 0;
  return Number.isFinite(value) && Math.abs(value - target) <= tolerance;
}

export function gradeAnswers(
  questions: GradableQuestion[],
  answers: Record<string, string | number>,
  passThreshold: number,
): GradeResult {
  const results = questions.map((question) => ({
    questionId: question.id,
    correct: isCorrectAnswer(question, answers[question.id]),
    explanation: question.explanation,
  }));
  const score = questions.length === 0 ? 0 : results.filter((r) => r.correct).length / questions.length;
  return { score, passed: score >= passThreshold, results };
}
