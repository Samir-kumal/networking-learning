import type { QuizSeed } from "../types";

export const quizzes: QuizSeed[] = [
  {
    chapterSlug: "core-ml-concepts",
    sectionSlug: "linear-regression",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "For a fitted line ŷ = mx + b, what do we call the difference (ŷᵢ − yᵢ) at a single data point?",
        options: ["The residual (error)", "The gradient", "The learning rate", "The loss"],
        correctAnswer: "The residual (error)",
        explanation:
          "The residual is the gap between the prediction and the actual value for one point. The loss (e.g. MSE) is a single number summarizing the residuals across every point, not one point's residual.",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "A line ŷ = 2x + 1 is used to predict a data point (x = 3, y = 5). What is the residual ŷ − y?",
        correctAnswer: 2,
        tolerance: 0.01,
        explanation: "ŷ = 2(3) + 1 = 7, and the actual value is y = 5, so the residual is 7 − 5 = 2.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt:
          "Gradient descent updates a parameter via θ ← θ − η·(∂Loss/∂θ). If θ = 5, η (learning rate) = 0.1, and ∂Loss/∂θ = 20, what is θ after one update step?",
        correctAnswer: 3,
        tolerance: 0.01,
        explanation: "θ_new = θ − η·gradient = 5 − 0.1 × 20 = 5 − 2 = 3.",
      },
      {
        order: 4,
        kind: "mcq",
        prompt: "For MSE = (1/n)Σ(mxᵢ + b − yᵢ)², which expression is the correct partial derivative ∂MSE/∂m?",
        options: [
          "(2/n)Σ(mxᵢ + b − yᵢ)xᵢ",
          "(2/n)Σ(mxᵢ + b − yᵢ)",
          "(1/n)Σ(mxᵢ + b − yᵢ)²xᵢ",
          "(2/n)Σxᵢ",
        ],
        correctAnswer: "(2/n)Σ(mxᵢ + b − yᵢ)xᵢ",
        explanation:
          "Applying the chain rule to (mxᵢ + b − yᵢ)² with respect to m: the outer derivative brings down a factor of 2(mxᵢ + b − yᵢ), and the inner derivative of (mxᵢ + b − yᵢ) with respect to m is xᵢ — giving (2/n)Σ(mxᵢ + b − yᵢ)xᵢ. (The ∂/∂b version drops the trailing xᵢ, since ∂(mxᵢ+b−yᵢ)/∂b = 1.)",
      },
      {
        order: 5,
        kind: "numeric",
        prompt:
          "For the two points (x=1, y=2) and (x=2, y=3), with a current fit ŷ = x (m=1, b=0), what is ∂MSE/∂b?",
        correctAnswer: -2,
        tolerance: 0.05,
        explanation:
          "Residuals: at x=1, ŷ=1 so error = 1−2 = −1; at x=2, ŷ=2 so error = 2−3 = −1. ∂MSE/∂b = (2/n)Σerror = (2/2)(−1 + −1) = −2.",
      },
    ],
  },
  {
    chapterSlug: "core-ml-concepts",
    sectionSlug: "loss-functions",
    questions: [
      {
        order: 1,
        kind: "numeric",
        prompt: "A model predicts [2, 4, 6, 8] for actual values [3, 5, 5, 20]. What is the MSE?",
        correctAnswer: 36.75,
        tolerance: 0.1,
        explanation:
          "Errors are 2−3=−1, 4−5=−1, 6−5=1, 8−20=−12. Squared: 1, 1, 1, 144, summing to 147. MSE = 147/4 = 36.75.",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "Using the same predictions [2, 4, 6, 8] and actual values [3, 5, 5, 20], what is the MAE?",
        correctAnswer: 3.75,
        tolerance: 0.1,
        explanation:
          "Absolute errors are |−1|, |−1|, |1|, |−12| = 1, 1, 1, 12, summing to 15. MAE = 15/4 = 3.75 — far smaller than the MSE of 36.75, because MAE doesn't square (and thus doesn't amplify) the one large error.",
      },
      {
        order: 3,
        kind: "mcq",
        prompt: "Compared to MAE, MSE is...",
        options: [
          "More sensitive to outliers, since errors are squared",
          "Less sensitive to outliers, since errors are squared",
          "Identical to MAE for every dataset",
          "Undefined whenever an error is negative",
        ],
        correctAnswer: "More sensitive to outliers, since errors are squared",
        explanation:
          "Squaring an error of size k contributes k² to the sum, while MAE contributes only k — so as an error grows, MSE's penalty grows much faster, letting a single outlier dominate the total loss.",
      },
      {
        order: 4,
        kind: "mcq",
        prompt: "For a fixed set of values, which constant prediction c minimizes the mean absolute error (MAE)?",
        options: ["The median of the values", "The mean of the values", "The maximum value", "The mode of the residuals"],
        correctAnswer: "The median of the values",
        explanation:
          "MAE is minimized at the median because moving c past the median always increases the total absolute distance to at least half the points more than it decreases the distance to the other half — this is also why MAE is considered outlier-robust.",
      },
      {
        order: 5,
        kind: "numeric",
        prompt: "For the values 3, 5, 5, 6, 20, what constant c minimizes the mean squared error (MSE)?",
        correctAnswer: 7.8,
        tolerance: 0.1,
        explanation:
          "MSE is minimized by the mean: (3 + 5 + 5 + 6 + 20) / 5 = 39 / 5 = 7.8. Notice the outlier (20) pulls this MSE-optimal value well above the median of 5 — MSE's optimum is dragged toward outliers, MAE's is not.",
      },
    ],
  },
  {
    chapterSlug: "core-ml-concepts",
    sectionSlug: "gradient-descent",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "What does the learning rate control in gradient descent?",
        options: [
          "The size of each step taken in the direction opposite the gradient",
          "The number of data points used per update",
          "The final value the loss function must reach",
          "The number of parameters in the model",
        ],
        correctAnswer: "The size of each step taken in the direction opposite the gradient",
        explanation:
          "The update rule θ ← θ − η·∇L scales the gradient step by η (the learning rate) — a bigger η means a bigger jump each iteration, regardless of how the model or data are structured.",
      },
      {
        order: 2,
        kind: "mcq",
        prompt: "What typically happens when the learning rate is too high?",
        options: [
          "Parameters overshoot the minimum, and the loss oscillates or diverges",
          "Training becomes perfectly stable and converges instantly",
          "The gradient becomes exactly zero every step",
          "The loss decreases monotonically but very slowly",
        ],
        correctAnswer: "Parameters overshoot the minimum, and the loss oscillates or diverges",
        explanation:
          "A step that's too large in a steep direction jumps past the minimum to the opposite side — often further away than it started, so the next step overshoots even further, producing oscillation or outright divergence.",
      },
      {
        order: 3,
        kind: "mcq",
        prompt: "What typically happens when the learning rate is too low?",
        options: [
          "Convergence is very slow, needing many more iterations to reach the minimum",
          "The loss immediately diverges to infinity",
          "The optimizer skips over the minimum entirely",
          "The gradient's sign flips every step",
        ],
        correctAnswer: "Convergence is very slow, needing many more iterations to reach the minimum",
        explanation:
          "Small steps are stable but make tiny progress each iteration — the trajectory still heads toward the minimum, it just takes far more iterations (and wall-clock time) to get there.",
      },
      {
        order: 4,
        kind: "numeric",
        prompt:
          "Using gradient descent x ← x − η·(∂L/∂x) on L(x,y) = x² + 3y², at point (x,y) = (1,1) with η = 0.1, what is the new value of x after one step?",
        correctAnswer: 0.8,
        tolerance: 0.02,
        explanation: "∂L/∂x = 2x = 2(1) = 2. x_new = 1 − 0.1 × 2 = 1 − 0.2 = 0.8.",
      },
      {
        order: 5,
        kind: "numeric",
        prompt: "Using the same setup — L(x,y) = x² + 3y² at (x,y) = (1,1) with η = 0.1 — what is the new value of y after one step?",
        correctAnswer: 0.4,
        tolerance: 0.02,
        explanation:
          "∂L/∂y = 6y = 6(1) = 6. y_new = 1 − 0.1 × 6 = 1 − 0.6 = 0.4 — y moves three times as far as x moved, because L is three times steeper along y.",
      },
    ],
  },
  {
    chapterSlug: "core-ml-concepts",
    sectionSlug: "overfitting-underfitting",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt:
          "A degree-1 (linear) model fit to clearly curved data has high error on both the training data and new data. This is a classic sign of...",
        options: ["Underfitting (high bias)", "Overfitting (high variance)", "Perfect generalization", "A learning rate that's too high"],
        correctAnswer: "Underfitting (high bias)",
        explanation:
          "The model is too simple (too few free parameters, or the wrong shape) to represent the true pattern — it's systematically wrong everywhere, which is the definition of high bias.",
      },
      {
        order: 2,
        kind: "mcq",
        prompt:
          "A degree-9 polynomial fit to only 16 noisy points achieves near-zero training loss but wiggles wildly between the points. This is a classic sign of...",
        options: ["Overfitting (high variance)", "Underfitting (high bias)", "Gradient explosion", "A learning rate that's too low"],
        correctAnswer: "Overfitting (high variance)",
        explanation:
          "With enough free coefficients relative to the number of points, the model can curve through the noise itself rather than the underlying trend — it fits this particular training set extremely well but would fit a different noisy sample from the same distribution very differently (high variance across samples).",
      },
      {
        order: 3,
        kind: "mcq",
        prompt:
          "For a fixed set of training points, as you raise the polynomial degree and refit by least squares each time, what happens to the training loss?",
        options: [
          "It decreases or stays the same — it never increases",
          "It always increases",
          "It stays exactly constant regardless of degree",
          "It becomes undefined above degree 3",
        ],
        correctAnswer: "It decreases or stays the same — it never increases",
        explanation:
          "Every lower-degree polynomial is a special case of a higher-degree one (with the extra coefficients set to zero), so the higher-degree least-squares fit can always match or beat the lower-degree fit's training loss — training loss alone can never tell you when you've started overfitting.",
      },
      {
        order: 4,
        kind: "mcq",
        prompt:
          "Why is a model with very low training loss but poor performance on new, unseen data considered a problem, even though it fits the training data well?",
        options: [
          "It has memorized noise specific to the training set instead of learning the true underlying pattern, so it generalizes poorly",
          "It ran out of gradient descent iterations before finishing",
          "Training loss and test loss should always be numerically equal",
          "It means the learning rate was set too high",
        ],
        correctAnswer:
          "It has memorized noise specific to the training set instead of learning the true underlying pattern, so it generalizes poorly",
        explanation:
          "The goal of a model is to perform well on new data, not just to minimize error on the exact points it was trained on — a large train/test performance gap is the signature of overfitting.",
      },
      {
        order: 5,
        kind: "numeric",
        prompt:
          "Fitting a degree-1 polynomial to a fixed noisy dataset gives training MSE ≈ 2.89. Fitting a degree-9 polynomial to the same points gives training MSE ≈ 0.04. Roughly how many times smaller is the degree-9 training loss than the degree-1 training loss (round to the nearest whole number)?",
        correctAnswer: 72,
        tolerance: 8,
        explanation:
          "2.89 ÷ 0.04 ≈ 72.25, so the degree-9 fit's training loss is roughly 72 times smaller — exactly the always-decreasing-training-loss effect from question 3, here quantified.",
      },
    ],
  },
];
