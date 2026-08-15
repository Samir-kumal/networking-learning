"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/ml/db";
import { requireProfile } from "@/lib/ml/auth/session";
import { recordAttempt, type GradeResult } from "@/lib/ml/progress/service";

const submitQuizAttemptInput = z.object({
  quizId: z.string().min(1),
  answers: z.record(z.string(), z.union([z.string(), z.number()])),
});

/** Grades a quiz attempt server-side and updates the caller's progress. Never trust a client-submitted score. */
export async function submitQuizAttempt(
  input: z.infer<typeof submitQuizAttemptInput>,
): Promise<GradeResult> {
  const { quizId, answers } = submitQuizAttemptInput.parse(input);
  const profile = await requireProfile();
  return recordAttempt(profile.id, quizId, answers);
}

const savePlaygroundStateInput = z.object({
  playgroundKey: z.string().min(1),
  state: z.record(z.string(), z.unknown()),
});

/** Upserts a playground's parameter state for the current profile (debounced client-side). */
export async function savePlaygroundState(
  input: z.infer<typeof savePlaygroundStateInput>,
): Promise<void> {
  const { playgroundKey, state } = savePlaygroundStateInput.parse(input);
  const profile = await requireProfile();

  const [existing] = await db
    .select()
    .from(schema.playgroundState)
    .where(
      and(
        eq(schema.playgroundState.userId, profile.id),
        eq(schema.playgroundState.playgroundKey, playgroundKey),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.playgroundState)
      .set({ state, updatedAt: new Date() })
      .where(eq(schema.playgroundState.id, existing.id));
  } else {
    await db.insert(schema.playgroundState).values({
      id: randomUUID(),
      userId: profile.id,
      playgroundKey,
      state,
      updatedAt: new Date(),
    });
  }
}

const loadPlaygroundStateInput = z.object({ playgroundKey: z.string().min(1) });

export async function loadPlaygroundState(
  input: z.infer<typeof loadPlaygroundStateInput>,
): Promise<Record<string, unknown> | null> {
  const { playgroundKey } = loadPlaygroundStateInput.parse(input);
  const profile = await requireProfile();

  const [row] = await db
    .select()
    .from(schema.playgroundState)
    .where(
      and(
        eq(schema.playgroundState.userId, profile.id),
        eq(schema.playgroundState.playgroundKey, playgroundKey),
      ),
    )
    .limit(1);

  return row?.state ?? null;
}

/** Dev/testing affordance: wipes the current profile's quiz attempts and section progress. */
export async function resetProgress(): Promise<void> {
  const profile = await requireProfile();
  await db.delete(schema.userProgress).where(eq(schema.userProgress.userId, profile.id));
  await db.delete(schema.quizAttempts).where(eq(schema.quizAttempts.userId, profile.id));
}
