import type { ReactNode } from "react";

/** A small "where you'll use this in ML" callout box, used throughout every chapter's concept explanation. */
export function ConceptCallout({
  title = "Where you'll use this",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-[13px] text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">
      <p className="font-semibold">{title}</p>
      <div className="mt-1 leading-relaxed">{children}</div>
    </div>
  );
}
