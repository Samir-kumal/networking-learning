import type { QuizSeed } from "../types";

export const quizzes: QuizSeed[] = [
  {
    chapterSlug: "neural-networks",
    sectionSlug: "perceptron-to-mlp",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "What does a single perceptron with weights w1, w2 and bias b compute from inputs x1, x2?",
        options: [
          "σ(w1·x1 + w2·x2 + b) — a weighted sum passed through an activation function",
          "The average of x1 and x2",
          "w1·x1 · w2·x2 + b",
          "The larger of x1 and x2, scaled by b",
        ],
        correctAnswer: "σ(w1·x1 + w2·x2 + b) — a weighted sum passed through an activation function",
        explanation:
          "A perceptron is a weighted sum (linear combination) of its inputs plus a bias, squashed by an activation function such as sigmoid — output = activation(w·x + b).",
      },
      {
        order: 2,
        kind: "mcq",
        prompt: "Why can a single perceptron never solve XOR, no matter how its weights are tuned?",
        options: [
          "Because XOR's positive and negative points aren't separable by any single straight line",
          "Because sigmoid always outputs exactly 0.5",
          "Because XOR needs three inputs instead of two",
          "Because perceptrons can't use a bias term",
        ],
        correctAnswer: "Because XOR's positive and negative points aren't separable by any single straight line",
        explanation:
          "A perceptron's decision boundary (where z = 0) is always a straight line (or hyperplane in higher dimensions). XOR's two positive points sit on opposite corners from its two negative points, so no single straight line can separate them — it isn't linearly separable.",
      },
      {
        order: 3,
        kind: "numeric",
        prompt: "For a perceptron with w1 = 2, w2 = -1, b = 0.5 and input (x1, x2) = (1, 1), what is z = w1·x1 + w2·x2 + b?",
        correctAnswer: 1.5,
        tolerance: 0.01,
        explanation: "z = 2(1) + (-1)(1) + 0.5 = 2 - 1 + 0.5 = 1.5.",
      },
      {
        order: 4,
        kind: "numeric",
        prompt: "Using z = 1.5 from the previous question, what is σ(z) = 1 / (1 + e^-z)?",
        correctAnswer: 0.8176,
        tolerance: 0.01,
        explanation: "σ(1.5) = 1 / (1 + e^-1.5) = 1 / (1 + 0.2231) ≈ 0.8176.",
      },
      {
        order: 5,
        kind: "mcq",
        prompt:
          "What capability does stacking perceptrons into a multilayer network with non-linear activations between layers add, that a single perceptron lacks?",
        options: [
          "The ability to represent non-linearly-separable functions like XOR",
          "Faster computation of purely linear functions",
          "The ability to use negative weights",
          "Removing the need for a bias term",
        ],
        correctAnswer: "The ability to represent non-linearly-separable functions like XOR",
        explanation:
          "Non-linear activations between stacked layers let the network bend and combine multiple straight-line boundaries into far more complex decision regions — enough to represent functions like XOR that no single line can separate.",
      },
    ],
  },
  {
    chapterSlug: "neural-networks",
    sectionSlug: "train-a-network",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "In this playground, what typically happens if the learning rate is set far too high?",
        options: [
          "Training becomes unstable — the loss oscillates or diverges instead of steadily decreasing",
          "The network trains in fewer steps with no downside",
          "The architecture automatically simplifies itself",
          "The dataset is regenerated with less noise",
        ],
        correctAnswer: "Training becomes unstable — the loss oscillates or diverges instead of steadily decreasing",
        explanation:
          "The learning rate scales the size of every SGD weight update. Too large a step can repeatedly overshoot the loss minimum, making the loss oscillate or blow up instead of converging smoothly.",
      },
      {
        order: 2,
        kind: "mcq",
        prompt: "Why does the spiral dataset typically need a larger or deeper architecture than XOR to classify well?",
        options: [
          "Its two interleaved arms form a far more complex, curved decision boundary that needs more representational capacity",
          "It has fewer data points than XOR",
          "It uses 3 input dimensions instead of 2",
          "It uses a different loss function than XOR",
        ],
        correctAnswer:
          "Its two interleaved arms form a far more complex, curved decision boundary that needs more representational capacity",
        explanation:
          "XOR only needs a boundary separating 4 fixed corner points. Spiral's two winding arms require a boundary complex enough to trace a spiral shape, which needs more hidden neurons and/or layers to represent.",
      },
      {
        order: 3,
        kind: "mcq",
        prompt: "In the network diagram, what do an edge's color and thickness represent?",
        options: [
          "Color encodes the weight's sign (positive vs. negative); thickness encodes |weight| (magnitude)",
          "Color encodes the neuron's activation function; thickness encodes the learning rate",
          "Color encodes the training step number; thickness encodes dataset size",
          "Color and thickness both encode the same value: the bias",
        ],
        correctAnswer: "Color encodes the weight's sign (positive vs. negative); thickness encodes |weight| (magnitude)",
        explanation:
          "The diagram reads network.weights directly: hue distinguishes positive (indigo) from negative (amber) weights, and line thickness scales with the absolute value of the weight.",
      },
      {
        order: 4,
        kind: "numeric",
        prompt:
          "generateDataset('circles', ...) generates two concentric rings. What is the approximate (noise-free) radius of the inner ring — the one with label 0?",
        correctAnswer: 0.5,
        tolerance: 0.05,
        explanation:
          "circlesDataset sets label 0's base radius to 0.5 and label 1's base radius to 1.0 (with small random noise added), producing two concentric rings scaled to roughly [-1, 1].",
      },
      {
        order: 5,
        kind: "mcq",
        prompt:
          "If every hidden layer used a linear (identity) activation instead of tanh/relu, what would happen to the network's representational power?",
        options: [
          "It would collapse to an equivalent single linear layer — stacking linear layers is still just linear",
          "It would become strictly more powerful than any non-linear network",
          "It would become unable to compute anything at all",
          "It would stay exactly as powerful, since depth matters more than activation choice",
        ],
        correctAnswer: "It would collapse to an equivalent single linear layer — stacking linear layers is still just linear",
        explanation:
          "Composing linear transformations (matrix multiplications) always yields another linear transformation, no matter how many layers are stacked. The non-linear activation between layers is exactly what lets depth add representational power.",
      },
    ],
  },
  {
    chapterSlug: "neural-networks",
    sectionSlug: "backpropagation-walkthrough",
    questions: [
      {
        order: 1,
        kind: "mcq",
        prompt: "What is the correct order of information flow in one backpropagation pass for a single training example?",
        options: [
          "Forward pass → loss → output-layer delta → output-layer gradients → backpropagate delta to hidden layer → hidden-layer gradients",
          "Loss → forward pass → hidden-layer gradients → output-layer delta → backpropagate → output-layer gradients",
          "Output-layer gradients → forward pass → hidden delta → loss → output delta → hidden gradients",
          "All gradients are computed simultaneously in one independent step, with no ordering",
        ],
        correctAnswer:
          "Forward pass → loss → output-layer delta → output-layer gradients → backpropagate delta to hidden layer → hidden-layer gradients",
        explanation:
          "Backprop first runs the forward pass to get activations and the loss, computes the output layer's delta from that loss, uses it for the output gradients, propagates the delta backward through the weights to get the hidden layer's delta, then computes the hidden layer's gradients from that.",
      },
      {
        order: 2,
        kind: "numeric",
        prompt:
          "For Sample A (input (0.05, 0.10), target 0.01) on the fixed 2-2-1 network, what is the output-layer delta δ^(2)? (For a sigmoid output with binary cross-entropy loss, δ^(2) = ŷ - y.)",
        correctAnswer: 0.7414,
        tolerance: 0.01,
        explanation:
          "The forward pass gives ŷ ≈ 0.7514. δ^(2) = ŷ - y ≈ 0.7514 - 0.01 = 0.7414 — the sigmoid derivative and the BCE loss gradient's denominator cancel exactly for this pairing, leaving prediction minus target.",
      },
      {
        order: 3,
        kind: "mcq",
        prompt: "What does a layer's bias gradient ∂L/∂b equal, according to backpropagation?",
        options: [
          "That layer's delta, exactly — no further multiplication needed",
          "The weight gradient divided by the number of inputs",
          "Always zero, since biases don't affect the loss",
          "The learning rate times the loss",
        ],
        correctAnswer: "That layer's delta, exactly — no further multiplication needed",
        explanation:
          "Since z = Wx + b, ∂z/∂b = 1, so by the chain rule ∂L/∂b = ∂L/∂z · 1 = δ — the bias gradient is exactly the delta at that neuron.",
      },
      {
        order: 4,
        kind: "mcq",
        prompt: "How is a hidden neuron's delta δ_i^(1) computed from the output layer's delta?",
        options: [
          "Pull the output delta back through the weight connecting to that hidden neuron, then multiply by that neuron's own local activation derivative",
          "Copy the output delta unchanged to every hidden neuron",
          "Multiply the output delta by the learning rate",
          "Average the output delta with the loss",
        ],
        correctAnswer:
          "Pull the output delta back through the weight connecting to that hidden neuron, then multiply by that neuron's own local activation derivative",
        explanation:
          "δ_i^(1) = (w_i^(2) · δ^(2)) · σ'(z_i^(1)) — the weight routes the output delta back to the specific hidden neuron it came from, and the local derivative accounts for that neuron's own non-linearity.",
      },
      {
        order: 5,
        kind: "slider-match",
        prompt:
          "Sample B (input (2, 2), target 1) produces a prediction much closer to its target than Sample A does. Approximately what is δ^(2) for Sample B?",
        correctAnswer: -0.2208,
        tolerance: 0.02,
        explanation:
          "Sample B's prediction (≈0.7792) is much closer to its target (1) than Sample A's, so δ^(2) = ŷ - y ≈ 0.7792 - 1 = -0.2208 — a much smaller-magnitude error means a much smaller-magnitude gradient at that neuron.",
      },
    ],
  },
];
