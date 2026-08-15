import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { findSection, nextSection } from "@/lib/ml/curriculum";
import { requireProfile } from "@/lib/ml/auth/session";
import { getProgressMap } from "@/lib/ml/progress/service";
import { loadPublicQuiz } from "@/lib/ml/progress/quiz-loader";
import { getSectionComponent } from "@/components/ml/section-registry";
import SectionQuizGate from "@/components/ml/SectionQuizGate";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ chapter: string; section: string }>;
}) {
  const { chapter: chapterSlug, section: sectionSlug } = await params;
  const found = findSection(chapterSlug, sectionSlug);
  if (!found) notFound();

  const profile = await requireProfile();
  const sectionId = `${chapterSlug}/${sectionSlug}`;
  const map = await getProgressMap(profile.id);
  const status = map[sectionId] ?? "locked";
  if (status === "locked") {
    redirect(`/ml/${chapterSlug}`);
  }

  const Content = getSectionComponent(chapterSlug, sectionSlug);
  const publicQuiz = await loadPublicQuiz(sectionId);
  const next = nextSection(chapterSlug, sectionSlug);
  const nextHref = next ? `/ml/${next.chapter.slug}/${next.section.slug}` : null;
  const nextSectionId = next ? `${next.chapter.slug}/${next.section.slug}` : null;
  const nextLabel = next ? `Next: ${next.section.title}` : "You've completed ML Foundations Lab! \u{1F389}";

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <div>
        <Link
          href={`/ml/${chapterSlug}`}
          className="text-[12px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          ← {found.chapter.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{found.section.title}</h1>
      </div>

      {Content ? (
        <Content />
      ) : (
        <p className="text-[13px] text-rose-600 dark:text-rose-400">
          This section&rsquo;s content module isn&rsquo;t registered in section-registry.ts — this is a bug.
        </p>
      )}

      {publicQuiz ? (
        <SectionQuizGate
          quiz={{
            id: publicQuiz.id,
            questions: publicQuiz.questions.map((q) => ({
              id: q.id,
              kind: q.kind,
              prompt: q.prompt,
              options: q.options ?? undefined,
            })),
          }}
          sectionId={sectionId}
          nextSectionId={nextSectionId}
          nextHref={nextHref}
          nextLabel={nextLabel}
        />
      ) : (
        <p className="text-[13px] text-rose-600 dark:text-rose-400">
          This section&rsquo;s quiz isn&rsquo;t seeded yet — run `npm run db:seed`.
        </p>
      )}
    </div>
  );
}
