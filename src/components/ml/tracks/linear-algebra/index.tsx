import type { ComponentType } from "react";
import VectorsSection from "./VectorsSection";
import MatrixTransformationsSection from "./MatrixTransformationsSection";
import MatrixOperationsSection from "./MatrixOperationsSection";
import EigenvectorsEigenvaluesSection from "./EigenvectorsEigenvaluesSection";

/**
 * Maps "<chapterSlug>/<sectionSlug>" to the section's content component.
 * Populated in src/components/ml/tracks/linear-algebra/*.tsx.
 */
export const registry: Record<string, ComponentType> = {
  "linear-algebra/vectors": VectorsSection,
  "linear-algebra/matrix-transformations": MatrixTransformationsSection,
  "linear-algebra/matrix-operations": MatrixOperationsSection,
  "linear-algebra/eigenvectors-eigenvalues": EigenvectorsEigenvaluesSection,
};
