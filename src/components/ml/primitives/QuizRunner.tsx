"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
  // Start in authored order so server and client render identically (hydration),
  // then shuffle once after mount.
  const [order, setOrder] = useState(quiz.questions);
  useEffect(() => {
    setOrder(shuffled(quiz.questions));
  }, [quiz.questions]);
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
                <fieldset className="min-w-0 space-y-1.5">
                  <legend className="sr-only">{question.prompt}</legend>
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
                </fieldset>
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

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div key="submit" exit={{ opacity: 0, scale: 0.95 }} className="inline-block">
            <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
              {submitting ? "Grading…" : "Submit quiz"}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
          >
            <p className="text-sm font-medium text-foreground">
              Score: {Math.round(result.score * 100)}% —{" "}
              <span className={result.passed ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
                {result.passed ? "Passed" : "Not passed"}
              </span>
            </p>
            {!result.passed && (
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
