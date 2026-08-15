import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/ml/db";
import type { QuestionKind } from "@/lib/ml/quizzes/types";

export interface PublicQuestion {
  id: string;
  kind: QuestionKind;
  prompt: string;
  options: string[] | null;
}

export interface PublicQuiz {
  id: string;
  questions: PublicQuestion[];
}

/**
 * Loads a section's quiz WITHOUT correctAnswer/tolerance/explanation — those are
 * only ever revealed by submitQuizAttempt's server-side grading result, never
 * shipped to the client ahead of a submission.
 */
export async function loadPublicQuiz(sectionId: string): Promise<PublicQuiz | null> {
  const [quizRow] = await db.select().from(schema.quizzes).where(eq(schema.quizzes.sectionId, sectionId)).limit(1);
  if (!quizRow) return null;

  const questions = await db
    .select({
      id: schema.questions.id,
      kind: schema.questions.kind,
      prompt: schema.questions.prompt,
      options: schema.questions.options,
    })
    .from(schema.questions)
    .where(eq(schema.questions.quizId, quizRow.id))
    .orderBy(schema.questions.order);

  return { id: quizRow.id, questions };
}
