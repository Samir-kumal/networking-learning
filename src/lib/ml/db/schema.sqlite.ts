// Drizzle schema (SQLite dialect) — the default, fully-supported ML Foundations Lab
// database. See schema.pg.ts for the structurally-mirrored Postgres dialect and
// src/lib/ml/db/index.ts for how the active dialect is selected at runtime via
// ML_DB_DRIVER. Keep table/column names in perfect sync between the two files —
// index.ts type-bridges the Postgres schema onto these types, which only holds if
// the shapes match.
import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const chapters = sqliteTable("chapters", {
  id: text("id").primaryKey(), // kebab-case slug, e.g. "linear-algebra"
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  order: integer("order").notNull(),
});

export const sections = sqliteTable("sections", {
  id: text("id").primaryKey(), // kebab-case slug, e.g. "vectors"
  chapterId: text("chapter_id")
    .notNull()
    .references(() => chapters.id),
  title: text("title").notNull(),
  order: integer("order").notNull(),
});

export const quizzes = sqliteTable("quizzes", {
  id: text("id").primaryKey(),
  sectionId: text("section_id")
    .notNull()
    .unique()
    .references(() => sections.id),
  passThreshold: real("pass_threshold").notNull().default(0.7),
});

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id")
    .notNull()
    .references(() => quizzes.id),
  order: integer("order").notNull(),
  kind: text("kind", { enum: ["mcq", "numeric", "slider-match"] }).notNull(),
  prompt: text("prompt").notNull(),
  /** MCQ only — the list of choice strings shown to the user. */
  options: text("options", { mode: "json" }).$type<string[] | null>(),
  /** MCQ: matching option string. numeric/slider-match: the target number. */
  correctAnswer: text("correct_answer", { mode: "json" })
    .notNull()
    .$type<string | number>(),
  /** numeric/slider-match: absolute tolerance for a correct match. */
  tolerance: real("tolerance"),
  explanation: text("explanation").notNull(),
});

export const quizAttempts = sqliteTable("quiz_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  quizId: text("quiz_id")
    .notNull()
    .references(() => quizzes.id),
  score: real("score").notNull(),
  passed: integer("passed", { mode: "boolean" }).notNull(),
  answers: text("answers", { mode: "json" })
    .notNull()
    .$type<Record<string, string | number>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const userProgress = sqliteTable(
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
    bestScore: real("best_score"),
    attemptCount: integer("attempt_count").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [uniqueIndex("user_progress_user_section_idx").on(t.userId, t.sectionId)],
);

export const playgroundState = sqliteTable(
  "playground_state",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    playgroundKey: text("playground_key").notNull(),
    state: text("state", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [uniqueIndex("playground_state_user_key_idx").on(t.userId, t.playgroundKey)],
);
