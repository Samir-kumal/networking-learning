import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db as defaultDb, schema } from "@/lib/ml/db";
import { ensureUserRow } from "@/lib/ml/auth/session";
import { flattenSections, nextSection } from "@/lib/ml/curriculum";
import { gradeAnswers, type GradeResult } from "./grading";

export type { GradeResult } from "./grading";

export type SectionStatus = "locked" | "unlocked" | "completed";
type DbClient = typeof defaultDb;

/** "<chapterSlug>/<sectionSlug>" -> that section's status for one user. */
export type ProgressMap = Record<string, SectionStatus>;

/**
 * A section with no user_progress row is "locked", except the very first section
 * in curriculum order, which defaults to "unlocked" for every user — this avoids
 * needing to pre-insert 27 "locked" rows for every new profile.
 */
export async function getProgressMap(userId: string, dbClient: DbClient = defaultDb): Promise<ProgressMap> {
  const rows = await dbClient
    .select({ sectionId: schema.userProgress.sectionId, status: schema.userProgress.status })
    .from(schema.userProgress)
    .where(eq(schema.userProgress.userId, userId));

  const map: ProgressMap = {};
  for (const row of rows) map[row.sectionId] = row.status as SectionStatus;

  const [first] = flattenSections();
  if (first) {
    const firstId = `${first.chapter.slug}/${first.section.slug}`;
    if (!(firstId in map)) map[firstId] = "unlocked";
  }
  return map;
}

export async function getSectionStatus(
  userId: string,
  chapterSlug: string,
  sectionSlug: string,
  dbClient: DbClient = defaultDb,
): Promise<SectionStatus> {
  const map = await getProgressMap(userId, dbClient);
  return map[`${chapterSlug}/${sectionSlug}`] ?? "locked";
}

/**
 * Grades a quiz attempt, records it, updates the section's best score/attempt
 * count, and — on pass — marks the section completed and unlocks the next section
 * in curriculum order (creating its progress row if it doesn't exist yet).
 */
export async function recordAttempt(
  userId: string,
  quizId: string,
  answers: Record<string, string | number>,
  dbClient: DbClient = defaultDb,
): Promise<GradeResult> {
  await ensureUserRow(userId);

  const [quiz] = await dbClient.select().from(schema.quizzes).where(eq(schema.quizzes.id, quizId)).limit(1);
  if (!quiz) throw new Error(`Unknown quiz: ${quizId}`);

  const questionRows = await dbClient
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.quizId, quizId))
    .orderBy(schema.questions.order);

  const result = gradeAnswers(questionRows, answers, quiz.passThreshold);

  await dbClient.insert(schema.quizAttempts).values({
    id: randomUUID(),
    userId,
    quizId,
    score: result.score,
    passed: result.passed,
    answers,
    createdAt: new Date(),
  });

  await upsertSectionProgress(dbClient, userId, quiz.sectionId, result);

  if (result.passed) {
    const [chapterSlug, sectionSlug] = quiz.sectionId.split("/");
    const next = nextSection(chapterSlug, sectionSlug);
    if (next) {
      await unlockSection(dbClient, userId, `${next.chapter.slug}/${next.section.slug}`);
    }
  }

  return result;
}

async function upsertSectionProgress(
  dbClient: DbClient,
  userId: string,
  sectionId: string,
  result: GradeResult,
): Promise<void> {
  const [existing] = await dbClient
    .select()
    .from(schema.userProgress)
    .where(and(eq(schema.userProgress.userId, userId), eq(schema.userProgress.sectionId, sectionId)))
    .limit(1);

  const bestScore = Math.max(result.score, existing?.bestScore ?? 0);
  const attemptCount = (existing?.attemptCount ?? 0) + 1;
  const status: SectionStatus = result.passed ? "completed" : (existing?.status as SectionStatus | undefined) ?? "unlocked";

  if (existing) {
    await dbClient
      .update(schema.userProgress)
      .set({ status, bestScore, attemptCount, updatedAt: new Date() })
      .where(eq(schema.userProgress.id, existing.id));
  } else {
    await dbClient
      .insert(schema.userProgress)
      .values({ id: randomUUID(), userId, sectionId, status, bestScore, attemptCount, updatedAt: new Date() });
  }
}

async function unlockSection(dbClient: DbClient, userId: string, sectionId: string): Promise<void> {
  const [existing] = await dbClient
    .select()
    .from(schema.userProgress)
    .where(and(eq(schema.userProgress.userId, userId), eq(schema.userProgress.sectionId, sectionId)))
    .limit(1);

  if (!existing) {
    await dbClient.insert(schema.userProgress).values({
      id: randomUUID(),
      userId,
      sectionId,
      status: "unlocked",
      bestScore: null,
      attemptCount: 0,
      updatedAt: new Date(),
    });
  } else if (existing.status === "locked") {
    await dbClient
      .update(schema.userProgress)
      .set({ status: "unlocked", updatedAt: new Date() })
      .where(eq(schema.userProgress.id, existing.id));
  }
}
