import type { QuizSeed } from "../types";

export const quizzes: QuizSeed[] = [
  {
    chapterSlug: "probability-statistics",
    sectionSlug: "distributions",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "For a continuous random variable, what does the total area under its PDF curve equal?",
        options: ["0", "1", "The mean of the distribution", "The variance of the distribution"],
        correctAnswer: "1",
        explanation:
          "A PDF must integrate to 1 over its whole domain — that's what makes it a valid probability distribution (total probability across every possible outcome is 100%).",
      },
      {
        order: 2,
        kind: "mcq",
        prompt: "Which distribution is drawn as two bars — heights (1-p) and p — instead of a continuous curve?",
        options: ["Uniform", "Normal", "Bernoulli", "Exponential"],
        correctAnswer: "Bernoulli",
        explanation:
          "Bernoulli is discrete: X can only be 0 or 1, so it has a probability mass function (two bars summing to 1), not a probability density function.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt: "A uniform distribution is defined on [2, 6]. What is the constant height of its density p(x) on that interval?",
        correctAnswer: 0.25,
        tolerance: 0.02,
        explanation: "p(x) = 1/(b-a) = 1/(6-2) = 1/4 = 0.25 for x in [2,6], and 0 outside it.",
      },
      {
        order: 4,
        kind: "numeric",
        prompt: "For the standard normal distribution N(0,1), what is p(0) — the density at its peak?",
        correctAnswer: 0.399,
        tolerance: 0.01,
        explanation:
          "p(0) = 1/(σ√(2π)) · e^0 = 1/(1·√(2π)) ≈ 1/2.5066 ≈ 0.3989 — this is the tallest point of the standard bell curve.",
      },
      {
        order: 5,
        kind: "mcq",
        prompt: "For a normal distribution with μ fixed, what happens to the curve's peak height as σ increases?",
        options: [
          "It gets taller and narrower",
          "It gets shorter and wider",
          "It stays exactly the same height",
          "It shifts to the left",
        ],
        correctAnswer: "It gets shorter and wider",
        explanation:
          "The area under the curve must always stay 1. Spreading the distribution out (larger σ) means the peak height 1/(σ√(2π)) must shrink to keep the total area constant — width and height trade off against each other.",
      },
    ],
  },
  {
    chapterSlug: "probability-statistics",
    sectionSlug: "expectation-variance-bayes",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "Expanding Var(X) = E[(X - E[X])²] algebraically gives which equivalent shortcut formula?",
        options: ["E[X²] - E[X]²", "E[X]² - E[X²]", "E[X²] + E[X]²", "2E[X] - E[X²]"],
        correctAnswer: "E[X²] - E[X]²",
        explanation:
          "E[(X-μ)²] = E[X² - 2μX + μ²] = E[X²] - 2μE[X] + μ². Since E[X] = μ, that middle term is -2μ², leaving E[X²] - μ² = E[X²] - E[X]² — 'mean of the squares minus the square of the mean.'",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "A weighted die has outcomes 1, 2, 3, 4 with probabilities 0.1, 0.2, 0.3, 0.4. What is E[X]?",
        correctAnswer: 3,
        tolerance: 0.05,
        explanation: "E[X] = 1(0.1) + 2(0.2) + 3(0.3) + 4(0.4) = 0.1 + 0.4 + 0.9 + 1.6 = 3.0.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt: "For that same die (outcomes 1,2,3,4 with probabilities 0.1,0.2,0.3,0.4), what is Var(X)?",
        correctAnswer: 1,
        tolerance: 0.05,
        explanation:
          "E[X²] = 1²(0.1) + 2²(0.2) + 3²(0.3) + 4²(0.4) = 0.1 + 0.8 + 2.7 + 6.4 = 10.0. Var(X) = E[X²] - E[X]² = 10.0 - 3.0² = 10.0 - 9.0 = 1.0.",
      },
      {
        order: 4,
        kind: "mcq",
        prompt: "In the medical-test Bayes' theorem scenario, what does 'sensitivity', P(+|D), represent?",
        options: [
          "The probability a healthy person tests negative",
          "The probability a diseased person tests positive",
          "The overall probability of testing positive, healthy or not",
          "The prior probability of having the disease",
        ],
        correctAnswer: "The probability a diseased person tests positive",
        explanation:
          "Sensitivity is a property of the test conditioned on actually having the disease: P(test positive | has disease). It says nothing on its own about P(disease | positive) — that requires Bayes' theorem plus the prior.",
      },
      {
        order: 5,
        kind: "slider-match",
        prompt:
          "Prior P(D) = 2%, sensitivity P(+|D) = 90%, false-positive rate P(+|¬D) = 10%. Estimate P(D|+) as a decimal (e.g. 0.20 for 20%).",
        correctAnswer: 0.155,
        tolerance: 0.02,
        explanation:
          "P(+) = P(+|D)P(D) + P(+|¬D)P(¬D) = 0.9(0.02) + 0.1(0.98) = 0.018 + 0.098 = 0.116. P(D|+) = 0.018 / 0.116 ≈ 0.155 — despite a 90%-sensitive test, most positives are still false positives because the disease is rare.",
      },
    ],
  },
  {
    chapterSlug: "probability-statistics",
    sectionSlug: "maximum-likelihood",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "Intuitively, what does 'maximum likelihood estimation' choose?",
        options: [
          "Parameters that make the observed data as probable as possible under the assumed model",
          "Parameters that minimize how many data points are needed",
          "The largest possible numeric value for every parameter",
          "Random parameters, averaged over many trials",
        ],
        correctAnswer: "Parameters that make the observed data as probable as possible under the assumed model",
        explanation:
          "MLE asks 'which parameter values would have made the data I actually saw most likely to occur?' and picks those — it's fitting the model to the evidence, not to an arbitrary criterion.",
      },
      {
        order: 2,
        kind: "mcq",
        prompt: "Why do we maximize the log-likelihood ln L instead of the raw likelihood L?",
        options: [
          "Because ln L is always a positive number",
          "Because multiplying many small probabilities underflows toward 0 in floating point, while summing their logs doesn't — and since ln is strictly increasing, the maximizer is unchanged",
          "Because ln L is easier to plot on a graph",
          "Because the raw likelihood always equals exactly 1",
        ],
        correctAnswer:
          "Because multiplying many small probabilities underflows toward 0 in floating point, while summing their logs doesn't — and since ln is strictly increasing, the maximizer is unchanged",
        explanation:
          "Likelihood is a product of many densities, each typically well below 1, so it shrinks toward 0 numerically for even moderate sample sizes. Log-likelihood turns that product into a sum, which is numerically stable, and because ln() is monotonic it never moves the location of the maximum.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt: "For the 5 sample points {3, 4, 4, 6, 8}, what is the closed-form MLE estimate μ̂ (the sample mean)?",
        correctAnswer: 5,
        tolerance: 0.1,
        explanation: "μ̂ = (3 + 4 + 4 + 6 + 8) / 5 = 25 / 5 = 5.",
      },
      {
        order: 4,
        kind: "numeric",
        prompt:
          "For the same 5 points {3, 4, 4, 6, 8}, what is the closed-form MLE estimate σ̂ (standard deviation, dividing by n)?",
        correctAnswer: 1.789,
        tolerance: 0.1,
        explanation:
          "Deviations from the mean (5) are -2, -1, -1, 1, 3; squared: 4, 1, 1, 1, 9, summing to 16. σ̂ = √(16/5) = √3.2 ≈ 1.789.",
      },
      {
        order: 5,
        kind: "slider-match",
        prompt:
          "Using μ = 5 and σ = 1.8 (near the MLE optimum) for the points {3, 4, 4, 6, 8}, the log-likelihood ln L(μ,σ) is approximately what value?",
        correctAnswer: -10,
        tolerance: 0.5,
        explanation:
          "ln L = -n·ln(σ) - (n/2)·ln(2π) - Σ(xᵢ-μ)²/(2σ²) = -5·ln(1.8) - 2.5·ln(2π) - 16/(2·1.8²) ≈ -10.0. Moving μ or σ away from the sample mean/std in either direction makes this number more negative — it's a genuine maximum.",
      },
    ],
  },
];
