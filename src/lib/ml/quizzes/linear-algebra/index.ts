import type { QuizSeed } from "../types";

export const quizzes: QuizSeed[] = [
  {
    chapterSlug: "linear-algebra",
    sectionSlug: "vectors",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "What is (2, 5) + (3, -1)?",
        options: ["(5, 4)", "(1, 6)", "(6, -5)", "(5, -4)"],
        correctAnswer: "(5, 4)",
        explanation: "Vector addition is component-wise: (2+3, 5+(-1)) = (5, 4).",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "Compute the dot product of (3, 4) and (2, -1).",
        correctAnswer: 2,
        tolerance: 0.01,
        explanation: "a·b = a_x b_x + a_y b_y = (3)(2) + (4)(-1) = 6 - 4 = 2.",
      },
      {
        order: 3,
        kind: "mcq",
        prompt: "Two vectors are orthogonal (perpendicular) exactly when their dot product equals...",
        options: ["0", "1", "-1", "the product of their magnitudes"],
        correctAnswer: "0",
        explanation:
          "a·b = |a||b|cos(θ). At θ = 90°, cos(θ) = 0, so the dot product is 0 regardless of the vectors' lengths.",
      },
      {
        order: 4,
        kind: "numeric",
        prompt: "What is the magnitude (length) of the vector (3, 4)?",
        correctAnswer: 5,
        tolerance: 0.01,
        explanation: "|v| = sqrt(x^2 + y^2) = sqrt(9 + 16) = sqrt(25) = 5 — a 3-4-5 right triangle.",
      },
      {
        order: 5,
        kind: "mcq",
        prompt: "If vector v = (2, 3) is scaled by k = -2, the result is...",
        options: ["(-4, -6)", "(4, 6)", "(-4, 6)", "(0, 1)"],
        correctAnswer: "(-4, -6)",
        explanation: "kv = (kx, ky) = (-2·2, -2·3) = (-4, -6). A negative scalar also flips the vector's direction.",
      },
    ],
  },
  {
    chapterSlug: "linear-algebra",
    sectionSlug: "matrix-transformations",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "What does the matrix [[0, -1], [1, 0]] do to vectors?",
        options: [
          "Rotates them 90° counterclockwise",
          "Rotates them 90° clockwise",
          "Reflects them across the x-axis",
          "Scales them by 2",
        ],
        correctAnswer: "Rotates them 90° counterclockwise",
        explanation:
          "Applied to (1,0): (0·1 + -1·0, 1·1 + 0·0) = (0, 1). The point on the positive x-axis moves to the positive y-axis, a 90° counterclockwise turn.",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "Apply the matrix [[2, 0], [0, 3]] to the vector (4, 5). What is the x-coordinate of the result?",
        correctAnswer: 8,
        tolerance: 0.01,
        explanation: "x' = a·x + b·y = 2·4 + 0·5 = 8 (the y' = 0·4 + 3·5 = 15 coordinate is scaled independently).",
      },
      {
        order: 3,
        kind: "mcq",
        prompt: "A negative determinant indicates that the transformation...",
        options: [
          "flips orientation (mirrors the plane)",
          "scales space uniformly in every direction",
          "always rotates by exactly 180°",
          "is guaranteed to not be invertible",
        ],
        correctAnswer: "flips orientation (mirrors the plane)",
        explanation:
          "The sign of the determinant tracks orientation: positive preserves it, negative flips it (like a reflection), independent of the magnitude |det| which gives the area scale factor.",
      },
      {
        order: 4,
        kind: "numeric",
        prompt: "What is the determinant of [[3, 1], [2, 4]]?",
        correctAnswer: 10,
        tolerance: 0.01,
        explanation: "det = ad - bc = (3)(4) - (1)(2) = 12 - 2 = 10.",
      },
      {
        order: 5,
        kind: "mcq",
        prompt: "Under the shear matrix [[1, 1], [0, 1]], where does the point (0, 1) map to?",
        options: ["(1, 1)", "(0, 1)", "(1, 0)", "(2, 1)"],
        correctAnswer: "(1, 1)",
        explanation: "x' = 1·0 + 1·1 = 1, y' = 0·0 + 1·1 = 1, so (0,1) → (1,1) — a horizontal shear proportional to height.",
      },
    ],
  },
  {
    chapterSlug: "linear-algebra",
    sectionSlug: "matrix-operations",
    questions: [
      {
        order: 1,
        kind: "numeric",
        prompt: "For A = [[1, 2], [3, 4]] and B = [[2, 0], [1, 2]], what is the top-left entry of AB?",
        correctAnswer: 4,
        tolerance: 0.01,
        explanation: "(AB)_11 = row 1 of A · column 1 of B = (1)(2) + (2)(1) = 2 + 2 = 4.",
      },
      {
        order: 2,
        kind: "mcq",
        prompt: "For any matrix A and the identity matrix I, what is AI?",
        options: ["A", "I", "the zero matrix", "A²"],
        correctAnswer: "A",
        explanation: "The identity matrix is the multiplicative identity for matrices: AI = IA = A, always.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt: "What is the determinant of [[2, 4], [1, 2]]?",
        correctAnswer: 0,
        tolerance: 0.01,
        explanation: "det = ad - bc = (2)(2) - (4)(1) = 4 - 4 = 0 — this matrix is singular (not invertible).",
      },
      {
        order: 4,
        kind: "mcq",
        prompt: "A matrix with determinant 0 is...",
        options: [
          "not invertible (singular)",
          "invertible, with an inverse equal to itself",
          "always the identity matrix",
          "guaranteed to be diagonal",
        ],
        correctAnswer: "not invertible (singular)",
        explanation:
          "The inverse formula divides by (ad - bc). When that's 0, the division is undefined, matching the geometric fact that a det-0 matrix squashes the plane and destroys information that can't be recovered.",
      },
      {
        order: 5,
        kind: "numeric",
        prompt: "What is the bottom-right entry of the inverse of [[2, 0], [0, 4]]?",
        correctAnswer: 0.25,
        tolerance: 0.01,
        explanation:
          "det = (2)(4) - (0)(0) = 8. Inverse = (1/8)[[4, 0], [0, 2]], so the bottom-right entry is 2/8 = 0.25.",
      },
    ],
  },
  {
    chapterSlug: "linear-algebra",
    sectionSlug: "eigenvectors-eigenvalues",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "A vector v is an eigenvector of matrix A if...",
        options: [
          "Av = λv for some scalar λ (v's direction is unchanged, only scaled)",
          "Av = 0",
          "A is symmetric",
          "v has length exactly 1",
        ],
        correctAnswer: "Av = λv for some scalar λ (v's direction is unchanged, only scaled)",
        explanation:
          "That's the defining equation: transforming v by A produces a vector on the same line through the origin, merely scaled by λ (the eigenvalue).",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "What is the larger eigenvalue of [[2, 1], [1, 2]]?",
        correctAnswer: 3,
        tolerance: 0.01,
        explanation:
          "trace T = 4, det D = 4-1 = 3, discriminant = T² - 4D = 16-12 = 4, so λ = (4 ± 2)/2 = 3 or 1. The larger is 3.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt: "For matrix [[2, 1], [1, 2]] and eigenvector (1, -1), Av = λv. What is λ?",
        correctAnswer: 1,
        tolerance: 0.01,
        explanation:
          "Av = (2·1 + 1·(-1), 1·1 + 2·(-1)) = (1, -1) = 1·(1, -1), so λ = 1.",
      },
      {
        order: 4,
        kind: "mcq",
        prompt: "For a 2×2 matrix, the sum of the two eigenvalues always equals...",
        options: ["the trace (sum of the diagonal entries)", "the determinant", "zero", "the largest matrix entry"],
        correctAnswer: "the trace (sum of the diagonal entries)",
        explanation:
          "λ1 + λ2 = T (the trace) and λ1·λ2 = D (the determinant) — both fall directly out of the quadratic formula λ = (T ± √(T²-4D))/2.",
      },
      {
        order: 5,
        kind: "numeric",
        prompt: "What is the determinant of [[2, 1], [1, 2]]?",
        correctAnswer: 3,
        tolerance: 0.01,
        explanation:
          "det = (2)(2) - (1)(1) = 3. This also equals the product of the eigenvalues found earlier: 3 × 1 = 3.",
      },
    ],
  },
];
