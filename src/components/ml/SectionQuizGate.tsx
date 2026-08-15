"use client";

import Link from "next/link";
import { useState } from "react";
import { QuizRunner, type QuizRunnerQuestion } from "@/components/ml/primitives/QuizRunner";
import { useProgressStore } from "@/lib/ml/store/progressStore";

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
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Section Quiz</h2>
      <QuizRunner
        quiz={quiz}
        onPassed={() => {
          setStatus(sectionId, "completed");
          if (nextSectionId) setStatus(nextSectionId, "unlocked");
          setPassed(true);
        }}
      />
      {passed && nextHref && (
        <Link
          href={nextHref}
          className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-emerald-700"
        >
          {nextLabel} →
        </Link>
      )}
      {passed && !nextHref && (
        <p className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400">{nextLabel}</p>
      )}
    </div>
  );
}
