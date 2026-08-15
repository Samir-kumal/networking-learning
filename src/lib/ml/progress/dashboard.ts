import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/ml/db";
import { CURRICULUM, flattenSections } from "@/lib/ml/curriculum";
import { getProgressMap } from "./service";

export interface ChapterCompletion {
  slug: string;
  title: string;
  completed: number;
  total: number;
}

export interface RecentAttempt {
  sectionTitle: string;
  score: number;
  passed: boolean;
  createdAt: Date;
}

export interface DashboardData {
  totalSections: number;
  completedSections: number;
  chapterCompletion: ChapterCompletion[];
  recentAttempts: RecentAttempt[];
  streakDays: number;
  continueHref: string | null;
  continueLabel: string | null;
}

const RECENT_ATTEMPT_LIMIT = 10;

/** Aggregates a profile's progress into the numbers the /ml/progress dashboard shows. */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const map = await getProgressMap(userId);
  const flat = flattenSections();
  const totalSections = flat.length;
  const completedSections = flat.filter(
    (entry) => map[`${entry.chapter.slug}/${entry.section.slug}`] === "completed",
  ).length;

  const chapterCompletion: ChapterCompletion[] = CURRICULUM.map((chapter) => ({
    slug: chapter.slug,
    title: chapter.title,
    completed: chapter.sections.filter((s) => map[`${chapter.slug}/${s.slug}`] === "completed").length,
    total: chapter.sections.length,
  }));

  const sectionsByQuizId = new Map(flat.map((entry) => [`${entry.chapter.slug}/${entry.section.slug}`, entry]));

  const attemptRows = await db
    .select()
    .from(schema.quizAttempts)
    .where(eq(schema.quizAttempts.userId, userId))
    .orderBy(desc(schema.quizAttempts.createdAt))
    .limit(RECENT_ATTEMPT_LIMIT);

  const recentAttempts: RecentAttempt[] = attemptRows.map((attempt) => {
    const entry = sectionsByQuizId.get(attempt.quizId);
    return {
      sectionTitle: entry ? entry.section.title : attempt.quizId,
      score: attempt.score,
      passed: attempt.passed,
      createdAt: attempt.createdAt,
    };
  });

  const allAttemptDates = await db
    .select({ createdAt: schema.quizAttempts.createdAt })
    .from(schema.quizAttempts)
    .where(eq(schema.quizAttempts.userId, userId));
  const streakDays = computeStreakDays(allAttemptDates.map((row) => row.createdAt));

  const continueEntry = flat.find((entry) => map[`${entry.chapter.slug}/${entry.section.slug}`] === "unlocked");
  const continueHref = continueEntry ? `/ml/${continueEntry.chapter.slug}/${continueEntry.section.slug}` : null;
  const continueLabel = continueEntry ? continueEntry.section.title : null;

  return { totalSections, completedSections, chapterCompletion, recentAttempts, streakDays, continueHref, continueLabel };
}

/** Consecutive UTC calendar days with at least one quiz attempt, counting back from today (or yesterday, if today has none yet). */
function computeStreakDays(timestamps: Date[]): number {
  const activeDates = new Set(timestamps.map((d) => d.toISOString().slice(0, 10)));

  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (!activeDates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (activeDates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
