import Link from "next/link";
import { CURRICULUM } from "@/lib/ml/curriculum";
import { requireProfile } from "@/lib/ml/auth/session";
import { getProgressMap, type SectionStatus } from "@/lib/ml/progress/service";

const STATUS_ICON: Record<SectionStatus, string> = { locked: "\u{1F512}", unlocked: "\u25B7", completed: "\u2705" };

export default async function MlHubPage() {
  const profile = await requireProfile();
  const map = await getProgressMap(profile.id);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">ML Foundations Lab</h1>
        <p className="mt-2 max-w-2xl text-[14px] text-slate-500 dark:text-slate-400">
          Machine learning from the math up — 8 chapters, {CURRICULUM.reduce((n, c) => n + c.sections.length, 0)}{" "}
          interactive sections. Pass each section&rsquo;s quiz to unlock the next.
        </p>
        <Link
          href="/ml/progress"
          className="mt-3 inline-block text-[13px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          View progress dashboard →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CURRICULUM.map((chapter) => {
          const statuses = chapter.sections.map((s) => map[`${chapter.slug}/${s.slug}`] ?? "locked");
          const completedCount = statuses.filter((s) => s === "completed").length;
          const firstAccessibleIndex = statuses.findIndex((s) => s !== "locked");
          const continueHref =
            firstAccessibleIndex === -1 ? null : `/ml/${chapter.slug}/${chapter.sections[firstAccessibleIndex].slug}`;

          return (
            <div
              key={chapter.slug}
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                  {chapter.order}. {chapter.title}
                </h2>
                <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                  {completedCount}/{chapter.sections.length}
                </span>
              </div>
              <p className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400">{chapter.summary}</p>
              <ul className="mt-3 space-y-1">
                {chapter.sections.map((section, index) => {
                  const status = statuses[index];
                  const sectionHref = `/ml/${chapter.slug}/${section.slug}`;
                  return (
                    <li key={section.slug} className="text-[13px]">
                      {status === "locked" ? (
                        <span className="text-slate-400 dark:text-slate-600">
                          {STATUS_ICON[status]} {section.title}
                        </span>
                      ) : (
                        <Link
                          href={sectionHref}
                          className="text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
                        >
                          {STATUS_ICON[status]} {section.title}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
              {continueHref && (
                <Link
                  href={continueHref}
                  className="mt-4 inline-block text-[12px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {completedCount === chapter.sections.length ? "Review chapter →" : "Continue →"}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
