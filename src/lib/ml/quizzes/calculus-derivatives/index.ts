import type { QuizSeed } from "../types";

export const quizzes: QuizSeed[] = [
  {
    chapterSlug: "calculus-derivatives",
    sectionSlug: "slope-and-rate-of-change",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "What does the secant line through (x₀, f(x₀)) and (x₀+Δx, f(x₀+Δx)) approach as Δx → 0?",
        options: [
          "The tangent line at x₀",
          "The x-axis",
          "A vertical line through x₀",
          "The y-intercept of f",
        ],
        correctAnswer: "The tangent line at x₀",
        explanation:
          "As Δx shrinks, the second point slides back along the curve to meet the first point, and the secant line's slope converges to the instantaneous rate of change — the tangent line's slope, f'(x₀).",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "For f(x) = x², what is the secant slope between x₀ = 1 and x₀+Δx = 1.1 (so Δx = 0.1)?",
        correctAnswer: 2.1,
        tolerance: 0.02,
        explanation:
          "f(1) = 1 and f(1.1) = 1.21, so the secant slope is (1.21 − 1) / 0.1 = 0.21 / 0.1 = 2.1 — already close to the analytic derivative f'(1) = 2.",
      },
      {
        order: 3,
        kind: "slider-match",
        prompt: "For f(x) = x², use f'(x) = 2x to estimate the exact derivative at x₀ = -2.",
        correctAnswer: -4,
        tolerance: 0.3,
        explanation: "f'(x) = 2x, so f'(-2) = 2 × (-2) = -4.",
      },
      {
        order: 4,
        kind: "mcq",
        prompt: "As Δx shrinks toward 0, the secant slope for f(x) = x² at x₀ = 1 approaches which value?",
        options: ["2", "1", "0", "4"],
        correctAnswer: "2",
        explanation:
          "The analytic derivative is f'(x) = 2x, so f'(1) = 2 — this is the limit the secant slope converges to as Δx → 0.",
      },
      {
        order: 5,
        kind: "numeric",
        prompt: "For f(x) = x², what is the exact derivative f'(3)?",
        correctAnswer: 6,
        tolerance: 0.01,
        explanation: "f'(x) = 2x, so f'(3) = 2 × 3 = 6.",
      },
    ],
  },
  {
    chapterSlug: "calculus-derivatives",
    sectionSlug: "derivative-rules",
    questions: [
      {
        order: 1,
        kind: "numeric",
        prompt: "Using the power rule, what is d/dx[x⁵] evaluated at x = 2?",
        correctAnswer: 80,
        tolerance: 0.5,
        explanation: "Power rule: d/dx[x⁵] = 5x⁴. At x = 2: 5 × 2⁴ = 5 × 16 = 80.",
      },
      {
        order: 2,
        kind: "mcq",
        prompt: "What is the general form of the product rule for d/dx[u(x)v(x)]?",
        options: ["u'v + uv'", "u'v'", "uv' − u'v", "(u + v)'"],
        correctAnswer: "u'v + uv'",
        explanation:
          "The product rule differentiates each factor in turn while holding the other fixed, then sums the two results: d/dx[uv] = u'v + uv'.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt: "For f(x) = x²(x+1), the product rule gives f'(x) = 2x(x+1) + x². What is f'(2)?",
        correctAnswer: 16,
        tolerance: 0.5,
        explanation:
          "f'(2) = 2×2×(2+1) + 2² = 4×3 + 4 = 12 + 4 = 16. (Check: expanding first gives f(x) = x³+x², so f'(x) = 3x²+2x, and f'(2) = 3×4 + 2×2 = 12+4 = 16 — matches.)",
      },
      {
        order: 4,
        kind: "mcq",
        prompt: "What is the chain rule's general form for d/dx[f(g(x))]?",
        options: ["f'(g(x)) · g'(x)", "f'(x) · g'(x)", "f(g'(x))", "f'(x) + g'(x)"],
        correctAnswer: "f'(g(x)) · g'(x)",
        explanation:
          "The chain rule differentiates the outer function at the inner function's value, then multiplies by the inner function's own derivative: d/dx[f(g(x))] = f'(g(x))·g'(x).",
      },
      {
        order: 5,
        kind: "numeric",
        prompt: "For f(x) = (2x+1)³, the chain rule gives f'(x) = 6(2x+1)². What is f'(1)?",
        correctAnswer: 54,
        tolerance: 1,
        explanation: "At x = 1: 2x+1 = 3, so f'(1) = 6 × 3² = 6 × 9 = 54.",
      },
    ],
  },
  {
    chapterSlug: "calculus-derivatives",
    sectionSlug: "partial-derivatives",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "What does the partial derivative ∂f/∂x measure?",
        options: [
          "The rate of change of f in the x-direction, holding y fixed",
          "The rate of change of f in the y-direction, holding x fixed",
          "The total change in f from any direction combined",
          "The value of f when x = 0",
        ],
        correctAnswer: "The rate of change of f in the x-direction, holding y fixed",
        explanation:
          "A partial derivative treats every other variable as a constant and asks the ordinary one-variable derivative question for just the variable being differentiated with respect to.",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "For f(x,y) = x² + y², what is ∂f/∂x evaluated at (x,y) = (3, 5)?",
        correctAnswer: 6,
        tolerance: 0.1,
        explanation:
          "∂f/∂x = 2x (the y² term is treated as a constant and vanishes when differentiating with respect to x), so at x = 3: 2 × 3 = 6. Note y's value doesn't matter here.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt: "For f(x,y) = x² + y², what is ∂f/∂y evaluated at (x,y) = (3, 5)?",
        correctAnswer: 10,
        tolerance: 0.1,
        explanation: "∂f/∂y = 2y, so at y = 5: 2 × 5 = 10.",
      },
      {
        order: 4,
        kind: "mcq",
        prompt: "At the point (2, 0) on f(x,y) = x² + y², which partial derivative equals zero?",
        options: ["∂f/∂y", "∂f/∂x", "Both are zero", "Neither is zero"],
        correctAnswer: "∂f/∂y",
        explanation:
          "∂f/∂x = 2x = 4 at x = 2, but ∂f/∂y = 2y = 0 at y = 0 — moving in the y-direction from (2,0) doesn't change f to first order, since y = 0 sits at the bottom of that slice's parabola.",
      },
      {
        order: 5,
        kind: "slider-match",
        prompt: "For f(x,y) = x² + y², estimate ∂f/∂x at x = -1.5 (any value of y).",
        correctAnswer: -3,
        tolerance: 0.3,
        explanation: "∂f/∂x = 2x, so at x = -1.5: 2 × (-1.5) = -3.",
      },
    ],
  },
  {
    chapterSlug: "calculus-derivatives",
    sectionSlug: "gradient-steepest-ascent",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "What does the gradient vector ∇f = (∂f/∂x, ∂f/∂y) point toward?",
        options: [
          "The direction of steepest ascent (fastest increase in f)",
          "The direction of steepest descent (fastest decrease in f)",
          "Always toward the origin",
          "A direction unrelated to how f changes",
        ],
        correctAnswer: "The direction of steepest ascent (fastest increase in f)",
        explanation:
          "The gradient is defined so that it always points in the direction that increases f fastest; its magnitude is how steep that fastest direction is.",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "For f(x,y) = x² + y², what is the x-component of ∇f at the point (4, 1)?",
        correctAnswer: 8,
        tolerance: 0.1,
        explanation: "∂f/∂x = 2x, so at x = 4: 2 × 4 = 8.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt: "For f(x,y) = x² + y², what is the y-component of ∇f at the point (4, 1)?",
        correctAnswer: 2,
        tolerance: 0.1,
        explanation: "∂f/∂y = 2y, so at y = 1: 2 × 1 = 2.",
      },
      {
        order: 4,
        kind: "numeric",
        prompt: "For f(x,y) = x² + y², what is the magnitude ‖∇f‖ at the point (3, 4)?",
        correctAnswer: 10,
        tolerance: 0.2,
        explanation:
          "∇f = (2×3, 2×4) = (6, 8), so ‖∇f‖ = √(6² + 8²) = √(36 + 64) = √100 = 10.",
      },
      {
        order: 5,
        kind: "mcq",
        prompt: "Gradient descent moves parameters in the direction of −∇f instead of +∇f because it wants to:",
        options: [
          "Minimize the function (go downhill)",
          "Maximize the function (go uphill)",
          "Keep the function's value constant",
          "Increase the learning rate automatically",
        ],
        correctAnswer: "Minimize the function (go downhill)",
        explanation:
          "∇f points uphill (steepest ascent). Since training wants to minimize a loss function, it steps in the opposite direction, −∇f, which points downhill toward lower loss.",
      },
    ],
  },
];
