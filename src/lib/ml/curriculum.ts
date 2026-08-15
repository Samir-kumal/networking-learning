// Single source of truth for the ML Foundations Lab curriculum: chapter/section
// slugs, titles, and order. The DB seed script (db/seed.ts) and the route registry
// (components/ml/section-registry.ts) both read this file so they cannot drift.
// See docs/superpowers/specs/2026-08-15-ml-foundations-lab-design.md §7.

export interface CurriculumSection {
  slug: string;
  title: string;
  order: number;
}

export interface CurriculumChapter {
  slug: string;
  title: string;
  summary: string;
  order: number;
  sections: CurriculumSection[];
}

export const CURRICULUM: CurriculumChapter[] = [
  {
    slug: "functions-graphs",
    title: "Functions & Graphs",
    summary:
      "The absolute basics: what a function is, how to read a graph, and the three function families (linear, polynomial, exponential/logarithmic) that show up everywhere in ML.",
    order: 1,
    sections: [
      { slug: "what-is-a-function", title: "What Is a Function?", order: 1 },
      { slug: "linear-functions", title: "Linear Functions: y = mx + b", order: 2 },
      {
        slug: "polynomials-exponentials-logarithms",
        title: "Polynomials, Exponentials & Logarithms",
        order: 3,
      },
    ],
  },
  {
    slug: "linear-algebra",
    title: "Linear Algebra",
    summary:
      "Vectors and matrices as geometric objects and transformations — the language every ML model is written in.",
    order: 2,
    sections: [
      { slug: "vectors", title: "Vectors: Geometric & Numeric Views", order: 1 },
      { slug: "matrix-transformations", title: "Matrices as Transformations", order: 2 },
      {
        slug: "matrix-operations",
        title: "Multiplication, Identity, Inverse & Determinant",
        order: 3,
      },
      { slug: "eigenvectors-eigenvalues", title: "Eigenvectors & Eigenvalues", order: 4 },
    ],
  },
  {
    slug: "calculus-derivatives",
    title: "Calculus: Derivatives",
    summary:
      "Slow, deep coverage of the derivative — slope, rate of change, the differentiation rules, and gradients in many dimensions.",
    order: 3,
    sections: [
      { slug: "slope-and-rate-of-change", title: "Slope of a Curve & Rate of Change", order: 1 },
      { slug: "derivative-rules", title: "Power, Product & Chain Rules", order: 2 },
      { slug: "partial-derivatives", title: "Partial Derivatives", order: 3 },
      { slug: "gradient-steepest-ascent", title: "The Gradient as Steepest Ascent", order: 4 },
    ],
  },
  {
    slug: "calculus-integration",
    title: "Calculus: Integration",
    summary:
      "Area under a curve, the fundamental theorem of calculus, and where integration shows up in probability and expectation.",
    order: 4,
    sections: [
      { slug: "area-under-curve", title: "Area Under a Curve: Riemann Sums", order: 1 },
      { slug: "fundamental-theorem", title: "The Fundamental Theorem of Calculus", order: 2 },
      { slug: "integration-in-ml", title: "Integration in Machine Learning", order: 3 },
    ],
  },
  {
    slug: "probability-statistics",
    title: "Probability & Statistics",
    summary:
      "Distributions, expectation, variance, Bayes' theorem, and the intuition behind maximum likelihood.",
    order: 5,
    sections: [
      { slug: "distributions", title: "Distributions: Uniform, Normal & Bernoulli", order: 1 },
      { slug: "expectation-variance-bayes", title: "Expectation, Variance & Bayes' Theorem", order: 2 },
      { slug: "maximum-likelihood", title: "Maximum Likelihood Intuition", order: 3 },
    ],
  },
  {
    slug: "core-ml-concepts",
    title: "Core ML Concepts",
    summary:
      "Linear regression, loss functions, gradient descent, and the overfitting/underfitting tradeoff — the core loop of supervised learning.",
    order: 6,
    sections: [
      { slug: "linear-regression", title: "Linear Regression", order: 1 },
      { slug: "loss-functions", title: "Loss Functions: MSE & MAE", order: 2 },
      { slug: "gradient-descent", title: "Gradient Descent", order: 3 },
      { slug: "overfitting-underfitting", title: "Overfitting & Underfitting", order: 4 },
    ],
  },
  {
    slug: "classification-activations",
    title: "Classification & Activation Functions",
    summary:
      "Sigmoid, tanh, ReLU and softmax; logistic regression's decision boundary; and why non-linearity is what makes deep networks powerful.",
    order: 7,
    sections: [
      { slug: "activation-functions", title: "Activation Functions", order: 1 },
      { slug: "logistic-regression", title: "Logistic Regression", order: 2 },
      { slug: "why-nonlinearity-matters", title: "Why Non-Linearity Matters", order: 3 },
    ],
  },
  {
    slug: "neural-networks",
    title: "Neural Networks",
    summary:
      "From a single perceptron to a trainable multilayer network — build one from scratch in the browser and watch backpropagation work, number by number.",
    order: 8,
    sections: [
      { slug: "perceptron-to-mlp", title: "Perceptron to Multilayer Network", order: 1 },
      { slug: "train-a-network", title: "Train a Network in the Browser", order: 2 },
      { slug: "backpropagation-walkthrough", title: "Backpropagation Walkthrough", order: 3 },
    ],
  },
];

export function findChapter(chapterSlug: string): CurriculumChapter | undefined {
  return CURRICULUM.find((c) => c.slug === chapterSlug);
}

export function findSection(
  chapterSlug: string,
  sectionSlug: string,
): { chapter: CurriculumChapter; section: CurriculumSection } | undefined {
  const chapter = findChapter(chapterSlug);
  const section = chapter?.sections.find((s) => s.slug === sectionSlug);
  return chapter && section ? { chapter, section } : undefined;
}

/** Ordered flat list of every section across every chapter, in curriculum order. */
export function flattenSections(): { chapter: CurriculumChapter; section: CurriculumSection }[] {
  return CURRICULUM.flatMap((chapter) =>
    chapter.sections.map((section) => ({ chapter, section })),
  );
}

/** The section immediately after (chapterSlug, sectionSlug) in curriculum order, if any. */
export function nextSection(
  chapterSlug: string,
  sectionSlug: string,
): { chapter: CurriculumChapter; section: CurriculumSection } | undefined {
  const flat = flattenSections();
  const index = flat.findIndex(
    (entry) => entry.chapter.slug === chapterSlug && entry.section.slug === sectionSlug,
  );
  return index === -1 ? undefined : flat[index + 1];
}
