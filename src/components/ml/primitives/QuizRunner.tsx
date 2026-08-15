"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { submitQuizAttempt } from "@/app/ml/actions";
import type { GradeResult } from "@/lib/ml/progress/service";

export interface QuizRunnerQuestion {
  id: string;
  kind: "mcq" | "numeric" | "slider-match";
  prompt: string;
  /** MCQ only. */
  options?: string[];
}

export interface QuizRunnerProps {
  quiz: { id: string; questions: QuizRunnerQuestion[] };
  onPassed: () => void;
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Renders a quiz (mcq/numeric/slider-match), grades it server-side, and shows per-question explanations. */
export function QuizRunner({ quiz, onPassed }: QuizRunnerProps) {
  const [order, setOrder] = useState(() => shuffled(quiz.questions));
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = order.every((q) => answers[q.id] !== undefined && answers[q.id] !== "");

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const graded = await submitQuizAttempt({ quizId: quiz.id, answers });
      setResult(graded);
      if (graded.passed) onPassed();
    } catch {
      setError("Could not grade this attempt — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetry() {
    setOrder(shuffled(quiz.questions));
    setAnswers({});
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      {order.map((question, index) => {
        const graded = result?.results.find((r) => r.questionId === question.id);
        return (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
            className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
          >
            <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
              {index + 1}. {question.prompt}
            </p>
            <div className="mt-2">
              {question.kind === "mcq" && (
                <div className="space-y-1.5">
                  {question.options?.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={answers[question.id] === option}
                        disabled={!!result}
                        onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
              {(question.kind === "numeric" || question.kind === "slider-match") && (
                <input
                  type="number"
                  step="any"
                  disabled={!!result}
                  value={answers[question.id] ?? ""}
                  onChange={(event) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [question.id]: event.target.value === "" ? "" : Number(event.target.value),
                    }))
                  }
                  className="w-32 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[13px] dark:border-slate-600 dark:bg-slate-900"
                />
              )}
            </div>
            <AnimatePresence>
              {graded && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.2 }}
                  className={`mt-2 text-[12px] ${
                    graded.correct ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {graded.correct ? "Correct — " : "Not quite — "}
                  {graded.explanation}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {error && <p className="text-[12px] text-rose-600 dark:text-rose-400">{error}</p>}

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.button
            key="submit"
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {submitting ? "Grading…" : "Submit Quiz"}
          </motion.button>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
          >
            <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
              Score: {Math.round(result.score * 100)}% —{" "}
              <span
                className={result.passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
              >
                {result.passed ? "Passed" : "Not passed"}
              </span>
            </p>
            {!result.passed && (
              <button
                onClick={handleRetry}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] font-medium transition hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                Retry
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
