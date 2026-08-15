import type { ComponentType } from "react";
import ActivationFunctionsSection from "./ActivationFunctionsSection";
import LogisticRegressionSection from "./LogisticRegressionSection";
import WhyNonlinearityMattersSection from "./WhyNonlinearityMattersSection";

/**
 * Maps "<chapterSlug>/<sectionSlug>" to the section's content component.
 * Populated in src/components/ml/tracks/classification-activations/*.tsx.
 */
export const registry: Record<string, ComponentType> = {
  "classification-activations/activation-functions": ActivationFunctionsSection,
  "classification-activations/logistic-regression": LogisticRegressionSection,
  "classification-activations/why-nonlinearity-matters": WhyNonlinearityMattersSection,
};
