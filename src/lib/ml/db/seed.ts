// Idempotent reference-data seed: upserts every chapter/section/quiz/question from
// the curriculum + quiz-seed source files. Run with `npm run db:seed`. Safe to
// re-run any time content changes — user data (users, quiz_attempts, user_progress,
// playground_state) is never touched here.
import { db, schema } from "./index";
import { CURRICULUM } from "../curriculum";
import { QUIZ_SEEDS } from "../quizzes";

const passThreshold = Number(process.env.ML_QUIZ_PASS_THRESHOLD ?? 0.7);

async function main() {
  for (const chapter of CURRICULUM) {
    await db
      .insert(schema.chapters)
      .values({ id: chapter.slug, title: chapter.title, summary: chapter.summary, order: chapter.order })
      .onConflictDoUpdate({
        target: schema.chapters.id,
        set: { title: chapter.title, summary: chapter.summary, order: chapter.order },
      });

    for (const section of chapter.sections) {
      const sectionId = `${chapter.slug}/${section.slug}`;
      await db
        .insert(schema.sections)
        .values({ id: sectionId, chapterId: chapter.slug, title: section.title, order: section.order })
        .onConflictDoUpdate({
          target: schema.sections.id,
          set: { chapterId: chapter.slug, title: section.title, order: section.order },
        });
    }
  }

  let questionCount = 0;

  for (const quizSeed of QUIZ_SEEDS) {
    const sectionId = `${quizSeed.chapterSlug}/${quizSeed.sectionSlug}`;
    const quizId = sectionId; // one quiz per section

    await db
      .insert(schema.quizzes)
      .values({ id: quizId, sectionId, passThreshold })
      .onConflictDoUpdate({
        target: schema.quizzes.id,
        set: { sectionId, passThreshold },
      });

    for (const q of quizSeed.questions) {
      const questionId = `${quizId}#${q.order}`;
      const row = {
        quizId,
        order: q.order,
        kind: q.kind,
        prompt: q.prompt,
        options: q.options ?? null,
        correctAnswer: q.correctAnswer,
        tolerance: q.tolerance ?? null,
        explanation: q.explanation,
      };
      await db
        .insert(schema.questions)
        .values({ id: questionId, ...row })
        .onConflictDoUpdate({ target: schema.questions.id, set: row });
      questionCount++;
    }
  }

  const sectionCount = CURRICULUM.reduce((n, c) => n + c.sections.length, 0);
  console.log(
    `ML Foundations Lab seed complete: ${CURRICULUM.length} chapters, ${sectionCount} sections, ${QUIZ_SEEDS.length} quizzes, ${questionCount} questions.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("ML Foundations Lab seed failed:", error);
    process.exit(1);
  });
