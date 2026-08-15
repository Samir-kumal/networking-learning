import type { ComponentType } from "react";
import SlopeAndRateOfChangeSection from "./SlopeAndRateOfChangeSection";
import DerivativeRulesSection from "./DerivativeRulesSection";
import PartialDerivativesSection from "./PartialDerivativesSection";
import GradientSteepestAscentSection from "./GradientSteepestAscentSection";

/**
 * Maps "<chapterSlug>/<sectionSlug>" to the section's content component.
 * Populated in src/components/ml/tracks/calculus-derivatives/*.tsx.
 */
export const registry: Record<string, ComponentType> = {
  "calculus-derivatives/slope-and-rate-of-change": SlopeAndRateOfChangeSection,
  "calculus-derivatives/derivative-rules": DerivativeRulesSection,
  "calculus-derivatives/partial-derivatives": PartialDerivativesSection,
  "calculus-derivatives/gradient-steepest-ascent": GradientSteepestAscentSection,
};
