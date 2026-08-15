import type { ComponentType } from "react";
import { registry as functionsGraphsRegistry } from "./tracks/functions-graphs";
import { registry as linearAlgebraRegistry } from "./tracks/linear-algebra";
import { registry as calculusDerivativesRegistry } from "./tracks/calculus-derivatives";
import { registry as calculusIntegrationRegistry } from "./tracks/calculus-integration";
import { registry as probabilityStatisticsRegistry } from "./tracks/probability-statistics";
import { registry as coreMlConceptsRegistry } from "./tracks/core-ml-concepts";
import { registry as classificationActivationsRegistry } from "./tracks/classification-activations";
import { registry as neuralNetworksRegistry } from "./tracks/neural-networks";

/** "<chapterSlug>/<sectionSlug>" -> the section's content component. */
export const SECTION_REGISTRY: Record<string, ComponentType> = {
  ...functionsGraphsRegistry,
  ...linearAlgebraRegistry,
  ...calculusDerivativesRegistry,
  ...calculusIntegrationRegistry,
  ...probabilityStatisticsRegistry,
  ...coreMlConceptsRegistry,
  ...classificationActivationsRegistry,
  ...neuralNetworksRegistry,
};

export function getSectionComponent(
  chapterSlug: string,
  sectionSlug: string,
): ComponentType | undefined {
  return SECTION_REGISTRY[`${chapterSlug}/${sectionSlug}`];
}
