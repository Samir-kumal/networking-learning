import Link from "next/link";
import { notFound } from "next/navigation";
import { findChapter } from "@/lib/ml/curriculum";
import { requireProfile } from "@/lib/ml/auth/session";
import { getProgressMap, type SectionStatus } from "@/lib/ml/progress/service";

const STATUS_ICON: Record<SectionStatus, string> = { locked: "\u{1F512}", unlocked: "\u25B7", completed: "\u2705" };

export default async function ChapterPage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter: chapterSlug } = await params;
  const chapter = findChapter(chapterSlug);
  if (!chapter) notFound();

  const profile = await requireProfile();
  const map = await getProgressMap(profile.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div>
        <Link href="/ml" className="text-[12px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
          ← All chapters
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {chapter.order}. {chapter.title}
        </h1>
        <p className="mt-2 text-[14px] text-slate-500 dark:text-slate-400">{chapter.summary}</p>
      </div>
      <ol className="space-y-2">
        {chapter.sections.map((section) => {
          const status = map[`${chapter.slug}/${section.slug}`] ?? "locked";
          return (
            <li
              key={section.slug}
              className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
            >
              {status === "locked" ? (
                <span className="text-[14px] text-slate-400 dark:text-slate-600">
                  {STATUS_ICON[status]} {section.order}. {section.title}
                </span>
              ) : (
                <Link
                  href={`/ml/${chapter.slug}/${section.slug}`}
                  className="text-[14px] font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400"
                >
                  {STATUS_ICON[status]} {section.order}. {section.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
