"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QuizRunner, type QuizRunnerQuestion } from "@/components/ml/primitives/QuizRunner";
import { useProgressStore } from "@/lib/ml/store/progressStore";
import { Button } from "@/components/ui/button";

export interface SectionQuizGateProps {
  quiz: { id: string; questions: QuizRunnerQuestion[] };
  /** "<chapterSlug>/<sectionSlug>" for this section. */
  sectionId: string;
  /** "<chapterSlug>/<sectionSlug>" for the next section in curriculum order, or null past the last one. */
  nextSectionId: string | null;
  nextHref: string | null;
  nextLabel: string;
}

/** Wires QuizRunner into the progress store: on pass, marks this section completed and the next one unlocked, then offers a continue link. */
export default function SectionQuizGate({ quiz, sectionId, nextSectionId, nextHref, nextLabel }: SectionQuizGateProps) {
  const [passed, setPassed] = useState(false);
  const setStatus = useProgressStore((state) => state.setStatus);

  return (
    <section className="space-y-4" aria-labelledby="section-quiz-heading">
      <h2 id="section-quiz-heading" className="text-base font-semibold tracking-tight text-foreground">
        Section quiz
      </h2>
      <QuizRunner
        quiz={quiz}
        onPassed={() => {
          setStatus(sectionId, "completed");
          if (nextSectionId) setStatus(nextSectionId, "unlocked");
          setPassed(true);
        }}
      />
      <AnimatePresence>
        {passed && nextHref && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Button asChild>
              <Link href={nextHref}>{nextLabel}</Link>
            </Button>
          </motion.div>
        )}
        {passed && !nextHref && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            role="status"
            className="text-sm font-medium text-emerald-700 dark:text-emerald-400"
          >
            {nextLabel}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
