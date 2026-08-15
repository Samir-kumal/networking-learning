import { describe, expect, it } from "vitest";
import { gradeAnswers, type GradableQuestion } from "./grading";

const mcq: GradableQuestion = {
  id: "q1",
  kind: "mcq",
  correctAnswer: "4",
  tolerance: null,
  explanation: "2 + 2 = 4",
};

const numeric: GradableQuestion = {
  id: "q2",
  kind: "numeric",
  correctAnswer: 3.14,
  tolerance: 0.01,
  explanation: "pi to 2 decimal places",
};

describe("gradeAnswers", () => {
  it("marks an exact MCQ match correct", () => {
    const result = gradeAnswers([mcq], { q1: "4" }, 0.7);
    expect(result.results[0]).toEqual({ questionId: "q1", correct: true, explanation: mcq.explanation });
  });

  it("marks a wrong MCQ option incorrect", () => {
    const result = gradeAnswers([mcq], { q1: "5" }, 0.7);
    expect(result.results[0].correct).toBe(false);
  });

  it("treats a missing answer as incorrect, not a crash", () => {
    const result = gradeAnswers([mcq], {}, 0.7);
    expect(result.results[0].correct).toBe(false);
    expect(result.score).toBe(0);
  });

  it("accepts a numeric answer exactly at the tolerance boundary", () => {
    const result = gradeAnswers([numeric], { q2: 3.15 }, 0.7);
    expect(result.results[0].correct).toBe(true);
  });

  it("rejects a numeric answer just past the tolerance boundary", () => {
    const result = gradeAnswers([numeric], { q2: 3.151 }, 0.7);
    expect(result.results[0].correct).toBe(false);
  });

  it("computes score as the fraction correct and applies the pass threshold", () => {
    const result = gradeAnswers([mcq, numeric], { q1: "4", q2: 3.14 }, 0.7);
    expect(result.score).toBe(1);
    expect(result.passed).toBe(true);

    const halfResult = gradeAnswers([mcq, numeric], { q1: "4", q2: 99 }, 0.7);
    expect(halfResult.score).toBe(0.5);
    expect(halfResult.passed).toBe(false);
  });

  it("scores an empty question list as 0 and never passes", () => {
    const result = gradeAnswers([], {}, 0.7);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });
});
