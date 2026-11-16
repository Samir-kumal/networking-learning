import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { findChapter } from "@/lib/ml/curriculum";
import { requireProfile } from "@/lib/ml/auth/session";
import { getProgressMap, type SectionStatus } from "@/lib/ml/progress/service";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

const STATUS_LABEL: Record<SectionStatus, string> = { locked: "Locked", unlocked: "Open", completed: "Passed" };

function StatusIcon({ status }: { status: SectionStatus }) {
  const className = "size-4 shrink-0";
  if (status === "completed") return <CheckCircle2 aria-hidden="true" className={`${className} text-emerald-600 dark:text-emerald-400`} />;
  if (status === "locked") return <Lock aria-hidden="true" className={`${className} text-muted-foreground`} />;
  return <Circle aria-hidden="true" className={`${className} text-primary`} />;
}

export default async function ChapterPage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter: chapterSlug } = await params;
  const chapter = findChapter(chapterSlug);
  if (!chapter) notFound();

  const profile = await requireProfile();
  const map = await getProgressMap(profile.id);
  const completed = chapter.sections.filter((s) => (map[`${chapter.slug}/${s.slug}`] ?? "locked") === "completed").length;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumb>
        <BreadcrumbList className="text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/ml">ML Foundations</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{chapter.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        eyebrow={`Chapter ${chapter.order}`}
        title={chapter.title}
        description={chapter.summary}
        actions={
          <Badge variant="outline" className="font-mono tabular-nums">
            {completed}/{chapter.sections.length} passed
          </Badge>
        }
      />

      <Card className="py-0">
        <CardContent className="p-0">
          <ol className="divide-y divide-border">
            {chapter.sections.map((section) => {
              const status = map[`${chapter.slug}/${section.slug}`] ?? "locked";
              const label = (
                <>
                  <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {String(section.order).padStart(2, "0")}
                  </span>
                  <StatusIcon status={status} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{section.title}</span>
                  <span className="text-xs text-muted-foreground">{STATUS_LABEL[status]}</span>
                </>
              );
              return (
                <li key={section.slug}>
                  {status === "locked" ? (
                    <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground">{label}</div>
                  ) : (
                    <Link
                      href={`/ml/${chapter.slug}/${section.slug}`}
                      className="flex items-center gap-3 px-4 py-3 text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      {label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
