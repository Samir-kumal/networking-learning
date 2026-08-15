import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRICULUM } from "@/lib/ml/curriculum";
import { createTestDb, schema, type TestDb } from "@/lib/ml/db/test-utils";
import { getProgressMap, recordAttempt } from "./service";

// service.ts calls ensureUserRow() from auth/session.ts, which uses the module-level
// default `db` (not the per-test in-memory client passed as `dbClient`). Stub it so
// tests don't touch the real sqlite file, and insert the user row directly against
// the test DB instead.
vi.mock("@/lib/ml/auth/session", () => ({ ensureUserRow: vi.fn() }));

function seedCurriculum(db: TestDb) {
  for (const chapter of CURRICULUM) {
    db.insert(schema.chapters)
      .values({ id: chapter.slug, title: chapter.title, summary: chapter.summary, order: chapter.order })
      .run();
    for (const section of chapter.sections) {
      db.insert(schema.sections)
        .values({
          id: `${chapter.slug}/${section.slug}`,
          chapterId: chapter.slug,
          title: section.title,
          order: section.order,
        })
        .run();
    }
  }
}

function seedQuiz(db: TestDb, sectionId: string, correctAnswer: string) {
  db.insert(schema.quizzes).values({ id: sectionId, sectionId, passThreshold: 0.7 }).run();
  db.insert(schema.questions)
    .values([
      {
        id: `${sectionId}#1`,
        quizId: sectionId,
        order: 1,
        kind: "mcq",
        prompt: "test question 1",
        options: ["a", "b", correctAnswer],
        correctAnswer,
        tolerance: null,
        explanation: "because",
      },
      {
        id: `${sectionId}#2`,
        quizId: sectionId,
        order: 2,
        kind: "mcq",
        prompt: "test question 2",
        options: ["a", "b", correctAnswer],
        correctAnswer,
        tolerance: null,
        explanation: "because",
      },
    ])
    .run();
}

describe("progress service", () => {
  let db: TestDb;
  const userId = "user-1";

  beforeEach(() => {
    db = createTestDb();
    seedCurriculum(db);
    db.insert(schema.users).values({ id: userId, displayName: null, createdAt: new Date() }).run();
  });

  it("defaults the first curriculum section to unlocked for a brand-new user", async () => {
    const map = await getProgressMap(userId, db);
    expect(map["functions-graphs/what-is-a-function"]).toBe("unlocked");
    expect(map["functions-graphs/linear-functions"]).toBeUndefined();
  });

  it("records a failing attempt without completing the section or unlocking the next one", async () => {
    seedQuiz(db, "functions-graphs/what-is-a-function", "correct");
    const result = await recordAttempt(
      userId,
      "functions-graphs/what-is-a-function",
      { [`functions-graphs/what-is-a-function#1`]: "correct", [`functions-graphs/what-is-a-function#2`]: "wrong" },
      db,
    );
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0.5);

    const map = await getProgressMap(userId, db);
    expect(map["functions-graphs/what-is-a-function"]).toBe("unlocked");
    expect(map["functions-graphs/linear-functions"]).toBeUndefined();
  });

  it("on pass, completes the section and unlocks the next section within the chapter", async () => {
    seedQuiz(db, "functions-graphs/what-is-a-function", "correct");
    const result = await recordAttempt(
      userId,
      "functions-graphs/what-is-a-function",
      { [`functions-graphs/what-is-a-function#1`]: "correct", [`functions-graphs/what-is-a-function#2`]: "correct" },
      db,
    );
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);

    const map = await getProgressMap(userId, db);
    expect(map["functions-graphs/what-is-a-function"]).toBe("completed");
    expect(map["functions-graphs/linear-functions"]).toBe("unlocked");
  });

  it("on pass, unlocks the next chapter's first section across a chapter boundary", async () => {
    seedQuiz(db, "functions-graphs/polynomials-exponentials-logarithms", "correct");
    await recordAttempt(
      userId,
      "functions-graphs/polynomials-exponentials-logarithms",
      {
        [`functions-graphs/polynomials-exponentials-logarithms#1`]: "correct",
        [`functions-graphs/polynomials-exponentials-logarithms#2`]: "correct",
      },
      db,
    );

    const map = await getProgressMap(userId, db);
    expect(map["functions-graphs/polynomials-exponentials-logarithms"]).toBe("completed");
    expect(map["linear-algebra/vectors"]).toBe("unlocked");
  });

  it("tracks best score and attempt count across a fail-then-pass retry", async () => {
    seedQuiz(db, "functions-graphs/what-is-a-function", "correct");
    await recordAttempt(
      userId,
      "functions-graphs/what-is-a-function",
      { [`functions-graphs/what-is-a-function#1`]: "correct", [`functions-graphs/what-is-a-function#2`]: "wrong" },
      db,
    );
    await recordAttempt(
      userId,
      "functions-graphs/what-is-a-function",
      { [`functions-graphs/what-is-a-function#1`]: "correct", [`functions-graphs/what-is-a-function#2`]: "correct" },
      db,
    );

    const rows = await db.select().from(schema.userProgress);
    const progressRow = rows.find((r) => r.sectionId === "functions-graphs/what-is-a-function");
    expect(progressRow?.attemptCount).toBe(2);
    expect(progressRow?.bestScore).toBe(1);
    expect(progressRow?.status).toBe("completed");
  });

  it("does not re-lock an already-unlocked next section on a later failing attempt elsewhere", async () => {
    seedQuiz(db, "functions-graphs/what-is-a-function", "correct");
    await recordAttempt(
      userId,
      "functions-graphs/what-is-a-function",
      { [`functions-graphs/what-is-a-function#1`]: "correct", [`functions-graphs/what-is-a-function#2`]: "correct" },
      db,
    );

    seedQuiz(db, "functions-graphs/linear-functions", "correct");
    await recordAttempt(
      userId,
      "functions-graphs/linear-functions",
      { [`functions-graphs/linear-functions#1`]: "wrong", [`functions-graphs/linear-functions#2`]: "wrong" },
      db,
    );

    const map = await getProgressMap(userId, db);
    expect(map["functions-graphs/linear-functions"]).toBe("unlocked");
  });

  it("throws for an unknown quiz id", async () => {
    await expect(recordAttempt(userId, `no-such-quiz-${randomUUID()}`, {}, db)).rejects.toThrow(/Unknown quiz/);
  });
});
