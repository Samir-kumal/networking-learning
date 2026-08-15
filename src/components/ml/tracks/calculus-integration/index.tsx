import type { ComponentType } from "react";
import AreaUnderCurveSection from "./AreaUnderCurveSection";
import FundamentalTheoremSection from "./FundamentalTheoremSection";
import IntegrationInMlSection from "./IntegrationInMlSection";

/**
 * Maps "<chapterSlug>/<sectionSlug>" to the section's content component.
 * Populated in src/components/ml/tracks/calculus-integration/*.tsx.
 */
export const registry: Record<string, ComponentType> = {
  "calculus-integration/area-under-curve": AreaUnderCurveSection,
  "calculus-integration/fundamental-theorem": FundamentalTheoremSection,
  "calculus-integration/integration-in-ml": IntegrationInMlSection,
};
