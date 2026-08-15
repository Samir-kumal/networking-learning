// Drizzle schema (Postgres dialect) — structural mirror of schema.sqlite.ts for the
// optional docker-compose Postgres upgrade path (ML_DB_DRIVER=postgres). Table and
// column names MUST stay identical to schema.sqlite.ts; src/lib/ml/db/index.ts relies
// on that to type-bridge this schema onto the SQLite schema's TypeScript types.
import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export const chapters = pgTable("chapters", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  order: integer("order").notNull(),
});

export const sections = pgTable("sections", {
  id: text("id").primaryKey(),
  chapterId: text("chapter_id")
    .notNull()
    .references(() => chapters.id),
  title: text("title").notNull(),
  order: integer("order").notNull(),
});

export const quizzes = pgTable("quizzes", {
  id: text("id").primaryKey(),
  sectionId: text("section_id")
    .notNull()
    .unique()
    .references(() => sections.id),
  passThreshold: doublePrecision("pass_threshold").notNull().default(0.7),
});

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id")
    .notNull()
    .references(() => quizzes.id),
  order: integer("order").notNull(),
  kind: text("kind", { enum: ["mcq", "numeric", "slider-match"] }).notNull(),
  prompt: text("prompt").notNull(),
  options: jsonb("options").$type<string[] | null>(),
  correctAnswer: jsonb("correct_answer").notNull().$type<string | number>(),
  tolerance: doublePrecision("tolerance"),
  explanation: text("explanation").notNull(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  quizId: text("quiz_id")
    .notNull()
    .references(() => quizzes.id),
  score: doublePrecision("score").notNull(),
  passed: boolean("passed").notNull(),
  answers: jsonb("answers").notNull().$type<Record<string, string | number>>(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export const userProgress = pgTable(
  "user_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id),
    status: text("status", {
      enum: ["locked", "unlocked", "completed"],
    }).notNull(),
    bestScore: doublePrecision("best_score"),
    attemptCount: integer("attempt_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  },
  (t) => [uniqueIndex("user_progress_user_section_idx").on(t.userId, t.sectionId)],
);

export const playgroundState = pgTable(
  "playground_state",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    playgroundKey: text("playground_key").notNull(),
    state: jsonb("state").notNull().$type<Record<string, unknown>>(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  },
  (t) => [uniqueIndex("playground_state_user_key_idx").on(t.userId, t.playgroundKey)],
);
