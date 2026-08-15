import type { QuizSeed } from "../types";

export const quizzes: QuizSeed[] = [
  {
    chapterSlug: "classification-activations",
    sectionSlug: "activation-functions",
    questions: [
      {
        order: 1,
        kind: "numeric",
        prompt: "sigmoid(z) = 1 / (1 + e^-z). What is sigmoid(0)?",
        correctAnswer: 0.5,
        tolerance: 0.01,
        explanation:
          "At z=0, e^-0 = 1, so sigmoid(0) = 1 / (1 + 1) = 1/2 = 0.5. This is why sigmoid's decision boundary sits exactly at z=0: sigmoid(z) >= 0.5 whenever z >= 0.",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "ReLU's derivative is 1 for z > 0 and 0 for z <= 0. What is the derivative of ReLU at z = 3?",
        correctAnswer: 1,
        tolerance: 0.01,
        explanation:
          "ReLU(z) = max(0, z). For any z > 0, ReLU behaves like the identity function y = z, whose slope is exactly 1 — so the derivative at z = 3 is 1.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt: "What is the derivative of ReLU at z = -2?",
        correctAnswer: 0,
        tolerance: 0.01,
        explanation:
          "For z <= 0, ReLU(z) = 0 is a flat constant line, so its slope — and therefore its derivative — is 0. This is also why ReLU neurons can 'die': once z stays negative, the gradient flowing back through that neuron is permanently 0.",
      },
      {
        order: 4,
        kind: "numeric",
        prompt: "tanh(z) = (e^z - e^-z) / (e^z + e^-z). What is tanh(0)?",
        correctAnswer: 0,
        tolerance: 0.01,
        explanation:
          "At z=0, e^0 - e^-0 = 1 - 1 = 0, so the whole fraction is 0. Unlike sigmoid (which is centered at 0.5), tanh is zero-centered, which is one reason it's often preferred for hidden layers.",
      },
      {
        order: 5,
        kind: "mcq",
        prompt: "Which statement correctly describes softmax(z) applied to a vector of logits?",
        options: [
          "Every output is positive and the full vector always sums to exactly 1",
          "It squashes each entry independently into (0, 1), like applying sigmoid to each logit separately",
          "It can produce negative probabilities when logits are negative",
          "Only the single largest logit gets a nonzero output",
        ],
        correctAnswer: "Every output is positive and the full vector always sums to exactly 1",
        explanation:
          "softmax(z)_i = e^{z_i} / sum_j e^{z_j}. Every e^{z_i} is positive, and dividing by the shared sum of all of them forces the outputs to add up to exactly 1 — unlike sigmoid, softmax couples every output to every other logit through that shared denominator.",
      },
    ],
  },
  {
    chapterSlug: "classification-activations",
    sectionSlug: "logistic-regression",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "In P(y=1|x) = sigmoid(w1*x1 + w2*x2 + b), what exactly defines the decision boundary?",
        options: [
          "The set of points where w1*x1 + w2*x2 + b = 0, i.e. P(y=1|x) = 0.5",
          "The set of points where P(y=1|x) = 1",
          "The single point where x1 = x2",
          "The y-intercept of the sigmoid curve itself",
        ],
        correctAnswer: "The set of points where w1*x1 + w2*x2 + b = 0, i.e. P(y=1|x) = 0.5",
        explanation:
          "sigmoid(z) = 0.5 exactly when z = 0. So the boundary between 'predict class 1' and 'predict class 0' is precisely the line w1*x1 + w2*x2 + b = 0 — everywhere else, the model leans toward one class or the other.",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "With w1=1, w2=1, b=-6, what is P(y=1|x) at x1=2, x2=2? (z = 1*2 + 1*2 - 6 = -2)",
        correctAnswer: 0.119,
        tolerance: 0.02,
        explanation:
          "z = 1*2 + 1*2 - 6 = -2. sigmoid(-2) = 1 / (1 + e^2) = 1 / (1 + 7.389) ≈ 1 / 8.389 ≈ 0.119 — a low probability, correctly reflecting that (2,2) sits on the negative side of this boundary.",
      },
      {
        order: 3,
        kind: "mcq",
        prompt: "If w2 = 0, what does the boundary x2 = -(w1*x1 + b)/w2 turn into?",
        options: [
          "A vertical line x1 = -b/w1 (the equation no longer depends on x2 at all)",
          "A horizontal line at x2 = 0",
          "It disappears — there is no boundary",
          "A single point at the origin",
        ],
        correctAnswer: "A vertical line x1 = -b/w1 (the equation no longer depends on x2 at all)",
        explanation:
          "With w2=0 the original equation is w1*x1 + b = 0, which has no x2 term at all — it's satisfied by every x2 as long as x1 = -b/w1. Geometrically that's a vertical line, which is also why the boundary formula x2 = -(w1*x1+b)/w2 divides by zero and must be guarded in code.",
      },
      {
        order: 4,
        kind: "numeric",
        prompt: "For the boundary x2 = -(w1*x1 + b)/w2 with w1=2, w2=1, b=-4, what is x2 when x1=0?",
        correctAnswer: 4,
        tolerance: 0.1,
        explanation:
          "x2 = -(2*0 + (-4)) / 1 = -(-4) / 1 = 4. Plugging x1=0, x2=4 back into w1*x1+w2*x2+b gives 2*0 + 1*4 - 4 = 0, confirming that point sits exactly on the boundary.",
      },
      {
        order: 5,
        kind: "mcq",
        prompt:
          "If you scale w1, w2, and b all by the same large positive factor (keeping their ratios, and therefore the boundary line, fixed), what happens to the model's predictions?",
        options: [
          "The sigmoid transition gets steeper — predictions near the boundary become more confident (closer to 0 or 1)",
          "The decision boundary line itself shifts to a new location",
          "Nothing changes at all, predictions are identical",
          "Predictions become less confident everywhere",
        ],
        correctAnswer: "The sigmoid transition gets steeper — predictions near the boundary become more confident (closer to 0 or 1)",
        explanation:
          "Scaling w1, w2, b by a constant k doesn't move the line w1*x1+w2*x2+b=0 (it's still satisfied by the same points), but it multiplies the magnitude of z away from the boundary, pushing sigmoid(z) harder toward 0 or 1 — the model becomes more confident without becoming any more accurate.",
      },
    ],
  },
  {
    chapterSlug: "classification-activations",
    sectionSlug: "why-nonlinearity-matters",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "Why can't a single logistic regression unit correctly classify all 4 XOR points?",
        options: [
          "XOR's two positive-class points and two negative-class points can't be separated by any single straight line — the classes aren't linearly separable",
          "Logistic regression can only handle one input feature at a time",
          "The sigmoid function isn't smooth enough to fit 4 points",
          "XOR only has 2 distinct points, not 4",
        ],
        correctAnswer:
          "XOR's two positive-class points and two negative-class points can't be separated by any single straight line — the classes aren't linearly separable",
        explanation:
          "(0,0) and (1,1) are label 0; (0,1) and (1,0) are label 1 — they sit on opposite diagonal corners of the unit square, interleaved. Any straight line you draw puts at least one same-label pair on opposite sides, because a linear model's decision boundary is always a single straight line.",
      },
      {
        order: 2,
        kind: "numeric",
        prompt: "In the XOR dataset, what is the target label for input (1, 0)?",
        correctAnswer: 1,
        tolerance: 0.01,
        explanation:
          "XOR (exclusive or) outputs 1 when exactly one of its two inputs is 1. Since x1=1 and x2=0 differ, XOR(1, 0) = 1.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt: "In the XOR dataset, what is the target label for input (1, 1)?",
        correctAnswer: 0,
        tolerance: 0.01,
        explanation:
          "XOR outputs 0 when both inputs are the same. Since x1=1 and x2=1 are equal, XOR(1, 1) = 0.",
      },
      {
        order: 4,
        kind: "mcq",
        prompt: "What architectural change lets a small neural network solve XOR where plain logistic regression cannot?",
        options: [
          "Adding a hidden layer with a non-linear activation (like tanh) between the input and the output",
          "Using a larger learning rate during gradient descent",
          "Removing the bias term from the output neuron",
          "Representing the weights with more decimal places",
        ],
        correctAnswer: "Adding a hidden layer with a non-linear activation (like tanh) between the input and the output",
        explanation:
          "A hidden layer with a non-linear activation lets the network transform the input space before the final linear boundary is drawn — the hidden units can bend space so that points that weren't linearly separable in the original coordinates become separable in the transformed ones.",
      },
      {
        order: 5,
        kind: "mcq",
        prompt:
          "A [2, 1, 1] network (one hidden neuron, tanh then sigmoid) thresholds a single monotonic function of one linear combination of the inputs. What does this imply about solving XOR?",
        options: [
          "It still cannot solve XOR — thresholding a monotonic function of one linear combination is equivalent to a linear decision boundary",
          "It can always solve XOR, because tanh is a non-linear function",
          "It solves XOR only if trained with a high enough learning rate",
          "It solves XOR automatically because it technically has a hidden layer",
        ],
        correctAnswer: "It still cannot solve XOR — thresholding a monotonic function of one linear combination is equivalent to a linear decision boundary",
        explanation:
          "With only one hidden neuron, the whole network output is sigmoid(v * tanh(w1x1+w2x2+b1) + b2). Since tanh and sigmoid are both strictly monotonic, this output crosses 0.5 along a curve that maps back to a single linear boundary in the original x1,x2 plane — one hidden neuron isn't enough capacity, you need multiple hidden neurons combining in different directions.",
      },
    ],
  },
];
