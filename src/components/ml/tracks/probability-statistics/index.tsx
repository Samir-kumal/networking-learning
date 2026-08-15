import type { ComponentType } from "react";
import DistributionsSection from "./DistributionsSection";
import ExpectationVarianceBayesSection from "./ExpectationVarianceBayesSection";
import MaximumLikelihoodSection from "./MaximumLikelihoodSection";

/**
 * Maps "<chapterSlug>/<sectionSlug>" to the section's content component.
 * Populated in src/components/ml/tracks/probability-statistics/*.tsx.
 */
export const registry: Record<string, ComponentType> = {
  "probability-statistics/distributions": DistributionsSection,
  "probability-statistics/expectation-variance-bayes": ExpectationVarianceBayesSection,
  "probability-statistics/maximum-likelihood": MaximumLikelihoodSection,
};
