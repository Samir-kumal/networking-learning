// Shared shape for per-section quiz seed data. Every chapter's quiz file
// (src/lib/ml/quizzes/<chapter-slug>/index.ts) exports an array of these, one per
// section in that chapter, in curriculum.ts order. db/seed.ts upserts them.

export type QuestionKind = "mcq" | "numeric" | "slider-match";

export interface QuizQuestionSeed {
  order: number;
  kind: QuestionKind;
  prompt: string;
  /** MCQ only — the choices shown to the user (correctAnswer must be one of these). */
  options?: string[];
  /**
   * MCQ: the exact matching option string.
   * numeric / slider-match: the target number the user's answer is compared against.
   */
  correctAnswer: string | number;
  /** numeric / slider-match only: absolute tolerance for a correct match. */
  tolerance?: number;
  /** Shown after grading, for both correct and incorrect answers. */
  explanation: string;
}

export interface QuizSeed {
  /** Must match a chapter slug in curriculum.ts. */
  chapterSlug: string;
  /** Must match a section slug within that chapter in curriculum.ts. */
  sectionSlug: string;
  questions: QuizQuestionSeed[];
}
