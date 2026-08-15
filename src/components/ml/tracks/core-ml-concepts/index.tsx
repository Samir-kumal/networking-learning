import type { ComponentType } from "react";
import LinearRegressionSection from "./LinearRegressionSection";
import LossFunctionsSection from "./LossFunctionsSection";
import GradientDescentSection from "./GradientDescentSection";
import OverfittingUnderfittingSection from "./OverfittingUnderfittingSection";

/**
 * Maps "<chapterSlug>/<sectionSlug>" to the section's content component.
 * Populated in src/components/ml/tracks/core-ml-concepts/*.tsx.
 */
export const registry: Record<string, ComponentType> = {
  "core-ml-concepts/linear-regression": LinearRegressionSection,
  "core-ml-concepts/loss-functions": LossFunctionsSection,
  "core-ml-concepts/gradient-descent": GradientDescentSection,
  "core-ml-concepts/overfitting-underfitting": OverfittingUnderfittingSection,
};
