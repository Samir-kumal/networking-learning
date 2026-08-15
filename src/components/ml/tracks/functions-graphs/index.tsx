import type { ComponentType } from "react";
import WhatIsAFunctionSection from "./WhatIsAFunctionSection";
import LinearFunctionsSection from "./LinearFunctionsSection";
import PolynomialsExponentialsLogarithmsSection from "./PolynomialsExponentialsLogarithmsSection";

/**
 * Maps "<chapterSlug>/<sectionSlug>" to the section's content component.
 * Populated in src/components/ml/tracks/functions-graphs/*.tsx.
 */
export const registry: Record<string, ComponentType> = {
  "functions-graphs/what-is-a-function": WhatIsAFunctionSection,
  "functions-graphs/linear-functions": LinearFunctionsSection,
  "functions-graphs/polynomials-exponentials-logarithms": PolynomialsExponentialsLogarithmsSection,
};
