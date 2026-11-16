import Link from "next/link";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { CURRICULUM } from "@/lib/ml/curriculum";
import { requireProfile } from "@/lib/ml/auth/session";
import { getProgressMap, type SectionStatus } from "@/lib/ml/progress/service";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABEL: Record<SectionStatus, string> = { locked: "Locked", unlocked: "Open", completed: "Passed" };

function StatusIcon({ status }: { status: SectionStatus }) {
  const className = "size-4 shrink-0";
  if (status === "completed") return <CheckCircle2 aria-hidden="true" className={`${className} text-emerald-600 dark:text-emerald-400`} />;
  if (status === "locked") return <Lock aria-hidden="true" className={`${className} text-muted-foreground`} />;
  return <Circle aria-hidden="true" className={`${className} text-primary`} />;
}

export default async function MlHubPage() {
  const profile = await requireProfile();
  const map = await getProgressMap(profile.id);
  const totalSections = CURRICULUM.reduce((n, c) => n + c.sections.length, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="ML Foundations"
        title="Machine learning from the math up"
        description={`${CURRICULUM.length} chapters and ${totalSections} interactive sections. Pass each section's quiz to unlock the next.`}
        actions={
          <Button asChild variant="outline">
            <Link href="/ml/progress">Progress dashboard</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CURRICULUM.map((chapter) => {
          const statuses = chapter.sections.map((s) => map[`${chapter.slug}/${s.slug}`] ?? "locked");
          const completedCount = statuses.filter((s) => s === "completed").length;
          const firstAccessibleIndex = statuses.findIndex((s) => s !== "locked");
          const continueHref =
            firstAccessibleIndex === -1 ? null : `/ml/${chapter.slug}/${chapter.sections[firstAccessibleIndex].slug}`;
          const done = completedCount === chapter.sections.length;

          return (
            <Card key={chapter.slug} className="gap-4 py-5">
              <CardHeader>
                <CardTitle className="text-base">
                  {chapter.order}. {chapter.title}
                </CardTitle>
                <CardDescription>{chapter.summary}</CardDescription>
                <CardAction>
                  <Badge variant={done ? "secondary" : "outline"} className="font-mono tabular-nums">
                    {completedCount}/{chapter.sections.length}
                  </Badge>
                </CardAction>
              </CardHeader>

              <CardContent>
                <ul className="divide-y divide-border rounded-md border border-border">
                  {chapter.sections.map((section, index) => {
                    const status = statuses[index];
                    const label = (
                      <>
                        <StatusIcon status={status} />
                        <span className="min-w-0 flex-1 truncate text-sm">{section.title}</span>
                        <span className="sr-only">({STATUS_LABEL[status]})</span>
                      </>
                    );
                    return (
                      <li key={section.slug}>
                        {status === "locked" ? (
                          <div className="flex items-center gap-2.5 px-3 py-2 text-muted-foreground">{label}</div>
                        ) : (
                          <Link
                            href={`/ml/${chapter.slug}/${section.slug}`}
                            className="flex items-center gap-2.5 px-3 py-2 text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                          >
                            {label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>

              {continueHref && (
                <CardFooter>
                  <Button asChild size="sm" variant={done ? "outline" : "default"}>
                    <Link href={continueHref}>{done ? "Review chapter" : "Continue"}</Link>
                  </Button>
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
