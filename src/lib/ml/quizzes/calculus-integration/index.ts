import type { QuizSeed } from "../types";

export const quizzes: QuizSeed[] = [
  {
    chapterSlug: "calculus-integration",
    sectionSlug: "area-under-curve",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "Which Riemann sum approximation does this playground's rectangles use?",
        options: [
          "Right sum — each rectangle's height is f at the right endpoint of its subinterval",
          "Left sum — each rectangle's height is f at the left endpoint of its subinterval",
          "Midpoint sum — each rectangle's height is f at the subinterval's midpoint",
          "Trapezoidal rule — each panel averages the left and right heights",
        ],
        correctAnswer: "Right sum — each rectangle's height is f at the right endpoint of its subinterval",
        explanation:
          "The playground computes sum = Δx · Σ f(a + i·Δx) for i = 1..n — using the right endpoint of each subinterval as the rectangle's height, hence 'right Riemann sum.'",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "For f(x) = x² + 1 on [0, 4], what is the exact value of ∫₀⁴ f(x) dx?",
        correctAnswer: 25.3333,
        tolerance: 0.02,
        explanation:
          "An antiderivative of x² + 1 is F(x) = x³/3 + x. F(4) - F(0) = (64/3 + 4) - 0 = 64/3 + 12/3 = 76/3 ≈ 25.3333.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt:
          "Using the right Riemann sum with n = 4 rectangles (Δx = 1) for f(x) = x² + 1 on [0, 4], what area does it give?",
        correctAnswer: 34,
        tolerance: 0.1,
        explanation:
          "Right endpoints are x = 1, 2, 3, 4 with heights f(1)=2, f(2)=5, f(3)=10, f(4)=17. Sum = 34, and Δx = 1, so the Riemann sum is 1 × 34 = 34.",
      },
      {
        order: 4,
        kind: "mcq",
        prompt: "As n (the rectangle count) increases toward infinity, what happens to the right Riemann sum?",
        options: [
          "It converges to the exact definite integral, since each rectangle's width shrinks toward 0",
          "It diverges to infinity",
          "It stays fixed at its n = 2 value",
          "It oscillates randomly with no limit",
        ],
        correctAnswer:
          "It converges to the exact definite integral, since each rectangle's width shrinks toward 0",
        explanation:
          "This convergence is literally the definition of the definite integral: ∫ₐᵇ f(x)dx = lim(n→∞) of the Riemann sum, as narrower rectangles trace the curve more and more exactly.",
      },
      {
        order: 5,
        kind: "mcq",
        prompt:
          "f(x) = x² + 1 is strictly increasing on [0, 4]. How does its right Riemann sum compare to the true area, for any finite n?",
        options: [
          "It overestimates the true area, because each rectangle's height comes from the larger right-hand value",
          "It underestimates the true area, because right endpoints are always the smaller value",
          "It always equals the true area exactly, regardless of n",
          "The comparison depends on whether n is even or odd",
        ],
        correctAnswer: "It overestimates the true area, because each rectangle's height comes from the larger right-hand value",
        explanation:
          "On an increasing function, the right endpoint of each subinterval is always its highest point, so every rectangle sits above the curve — consistent with the n=2 (44), n=4 (34), and n=8 (29.5) sums all landing above the exact 25.333.",
      },
    ],
  },
  {
    chapterSlug: "calculus-integration",
    sectionSlug: "fundamental-theorem",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "What does the Fundamental Theorem of Calculus say about A(x) = ∫ₐˣ f(t) dt?",
        options: [
          "A'(x) = f(x) — differentiating the accumulated-area function returns the original function",
          "A(x) = f'(x) for every x",
          "A(x) is always a constant, independent of x",
          "A(x) can only ever be computed numerically, never in closed form",
        ],
        correctAnswer: "A'(x) = f(x) — differentiating the accumulated-area function returns the original function",
        explanation:
          "This is the precise statement of the theorem: the derivative of the 'running area' function A(x) = ∫ₐˣ f(t)dt is f(x) itself — integration and differentiation undo each other.",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "For f(t) = 2t with antiderivative F(t) = t², what is ∫₀³ 2t dt?",
        correctAnswer: 9,
        tolerance: 0.05,
        explanation: "By the FTC, ∫₀³ 2t dt = F(3) - F(0) = 3² - 0² = 9 - 0 = 9.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt: "Using the same f(t) = 2t and F(t) = t², what is ∫₀⁵ 2t dt?",
        correctAnswer: 25,
        tolerance: 0.05,
        explanation: "∫₀⁵ 2t dt = F(5) - F(0) = 5² - 0² = 25.",
      },
      {
        order: 4,
        kind: "mcq",
        prompt: "In the playground, what does the marked point F(x₀) on the right-hand plot represent?",
        options: [
          "The shaded area under f from 0 to x₀ on the left-hand plot",
          "The slope of f at x₀",
          "The value of f at x₀",
          "The maximum value f ever reaches",
        ],
        correctAnswer: "The shaded area under f from 0 to x₀ on the left-hand plot",
        explanation:
          "F(x₀) is the antiderivative evaluated at x₀, which by the FTC equals ∫₀^x₀ f(t)dt — exactly the shaded area shown in the left-hand plot. That's the visual link the two panels demonstrate.",
      },
      {
        order: 5,
        kind: "numeric",
        prompt: "F(x) = x² is the antiderivative of f(x) = 2x. What is F'(x) at x = 3?",
        correctAnswer: 6,
        tolerance: 0.1,
        explanation:
          "F'(x) = 2x for F(x) = x², so F'(3) = 6, which equals f(3) = 2(3) = 6 — the derivative of the accumulated-area function gives back the original function, as the FTC states.",
      },
    ],
  },
  {
    chapterSlug: "calculus-integration",
    sectionSlug: "integration-in-ml",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "Why must a valid probability density function p(x) satisfy ∫₋∞^∞ p(x) dx = 1?",
        options: [
          "Because the probability that the random variable takes some value at all is 100%",
          "Because p(x) must always be a linear function",
          "Because otherwise p(x) would have to be negative somewhere",
          "Because the mean of the distribution must equal 1",
        ],
        correctAnswer: "Because the probability that the random variable takes some value at all is 100%",
        explanation:
          "The total area under a density is the probability the variable falls somewhere in its whole domain — an event that always happens, so the probability, and thus the total area, must be exactly 1.",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "For the standard normal density, what is P(-1 ≤ X ≤ 1), to two decimal places?",
        correctAnswer: 0.68,
        tolerance: 0.02,
        explanation:
          "This is the well-known '68-95-99.7 rule': about 68.27% (≈0.68) of a standard normal distribution's probability mass lies within 1 standard deviation of the mean.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt: "For the standard normal density, what is P(-2 ≤ X ≤ 2), to two decimal places?",
        correctAnswer: 0.95,
        tolerance: 0.02,
        explanation:
          "By the 68-95-99.7 rule, about 95.45% (≈0.95) of the distribution's mass lies within 2 standard deviations of the mean.",
      },
      {
        order: 4,
        kind: "mcq",
        prompt: "What quantity does E[X] = ∫ x · p(x) dx compute?",
        options: [
          "The probability-weighted average value of X — its expected value",
          "The total area under p(x)",
          "The largest value X can possibly take",
          "The variance of X",
        ],
        correctAnswer: "The probability-weighted average value of X — its expected value",
        explanation:
          "E[X] is the continuous analogue of a weighted average: instead of summing (value × probability) over a finite outcome list, you integrate (value × density) over the whole continuum of possible values.",
      },
      {
        order: 5,
        kind: "numeric",
        prompt:
          "The standard normal density is symmetric about x = 0, and essentially all of its mass lies within [-4, 4]. Approximately what is P(0 ≤ X ≤ 4)?",
        correctAnswer: 0.5,
        tolerance: 0.02,
        explanation:
          "Symmetry puts exactly half of the total probability (which sums to 1) above x = 0 and half below. Since the tails beyond ±4 hold only about 0.0000633 of the mass, P(0 ≤ X ≤ 4) is essentially the full upper half, ≈ 0.5.",
      },
    ],
  },
];
