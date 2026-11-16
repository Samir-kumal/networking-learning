import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { findSection, nextSection } from "@/lib/ml/curriculum";
import { requireProfile } from "@/lib/ml/auth/session";
import { getProgressMap } from "@/lib/ml/progress/service";
import { loadPublicQuiz } from "@/lib/ml/progress/quiz-loader";
import { getSectionComponent } from "@/components/ml/section-registry";
import SectionQuizGate from "@/components/ml/SectionQuizGate";
import { PageHeader } from "@/components/page-header";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

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
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList className="text-sm">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/ml">ML Foundations</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/ml/${chapterSlug}`}>{found.chapter.title}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">{found.section.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <PageHeader eyebrow={`Section ${found.section.order}`} title={found.section.title} />
      </div>

      {Content ? (
        <Content />
      ) : (
        <p role="alert" className="text-sm text-destructive">
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
        <p role="alert" className="text-sm text-destructive">
          This section&rsquo;s quiz isn&rsquo;t seeded yet — run `npm run db:seed`.
        </p>
      )}
    </div>
  );
}
