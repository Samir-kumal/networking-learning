import type { QuizSeed } from "./types";
import { quizzes as functionsGraphsQuizzes } from "./functions-graphs";
import { quizzes as linearAlgebraQuizzes } from "./linear-algebra";
import { quizzes as calculusDerivativesQuizzes } from "./calculus-derivatives";
import { quizzes as calculusIntegrationQuizzes } from "./calculus-integration";
import { quizzes as probabilityStatisticsQuizzes } from "./probability-statistics";
import { quizzes as coreMlConceptsQuizzes } from "./core-ml-concepts";
import { quizzes as classificationActivationsQuizzes } from "./classification-activations";
import { quizzes as neuralNetworksQuizzes } from "./neural-networks";

export type { QuizSeed, QuizQuestionSeed, QuestionKind } from "./types";

/** Every section's quiz seed data, aggregated in curriculum order. */
export const QUIZ_SEEDS: QuizSeed[] = [
  ...functionsGraphsQuizzes,
  ...linearAlgebraQuizzes,
  ...calculusDerivativesQuizzes,
  ...calculusIntegrationQuizzes,
  ...probabilityStatisticsQuizzes,
  ...coreMlConceptsQuizzes,
  ...classificationActivationsQuizzes,
  ...neuralNetworksQuizzes,
];
