import type { ComponentType } from "react";
import PerceptronToMlpSection from "./PerceptronToMlpSection";
import TrainANetworkSection from "./TrainANetworkSection";
import BackpropagationWalkthroughSection from "./BackpropagationWalkthroughSection";

/**
 * Maps "<chapterSlug>/<sectionSlug>" to the section's content component.
 * Populated in src/components/ml/tracks/neural-networks/*.tsx.
 */
export const registry: Record<string, ComponentType> = {
  "neural-networks/perceptron-to-mlp": PerceptronToMlpSection,
  "neural-networks/train-a-network": TrainANetworkSection,
  "neural-networks/backpropagation-walkthrough": BackpropagationWalkthroughSection,
};
