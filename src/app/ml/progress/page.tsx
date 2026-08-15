import Link from "next/link";
import { requireProfile } from "@/lib/ml/auth/session";
import { getDashboardData } from "@/lib/ml/progress/dashboard";

export default async function ProgressDashboardPage() {
  const profile = await requireProfile();
  const data = await getDashboardData(profile.id);
  const overallPct = data.totalSections === 0 ? 0 : Math.round((data.completedSections / data.totalSections) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <div>
        <Link href="/ml" className="text-[12px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
          ← ML Foundations Lab
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">Progress Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Overall completion</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{overallPct}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Sections completed</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            {data.completedSections} / {data.totalSections}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Current streak</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            {data.streakDays} day{data.streakDays === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {data.continueHref && (
        <Link
          href={data.continueHref}
          className="block rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-[13px] font-medium text-indigo-900 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-950/70"
        >
          Continue where you left off: {data.continueLabel} →
        </Link>
      )}

      <div>
        <h2 className="mb-3 text-[15px] font-semibold text-slate-900 dark:text-slate-100">Chapter completion</h2>
        <div className="space-y-2">
          {data.chapterCompletion.map((chapter) => (
            <div key={chapter.slug} className="flex items-center gap-3">
              <span className="w-40 flex-shrink-0 truncate text-[13px] text-slate-600 dark:text-slate-300">
                {chapter.title}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className="h-full bg-indigo-500"
                  style={{ width: `${chapter.total === 0 ? 0 : (chapter.completed / chapter.total) * 100}%` }}
                />
              </div>
              <span className="w-10 flex-shrink-0 text-right font-mono text-[11px] text-slate-400 dark:text-slate-500">
                {chapter.completed}/{chapter.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      {data.recentAttempts.length > 0 && (
        <div>
          <h2 className="mb-3 text-[15px] font-semibold text-slate-900 dark:text-slate-100">Recent quiz attempts</h2>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <th className="pb-2 font-medium">Section</th>
                <th className="pb-2 font-medium">Score</th>
                <th className="pb-2 font-medium">Result</th>
                <th className="pb-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {data.recentAttempts.map((attempt, index) => (
                <tr key={index} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 text-slate-700 dark:text-slate-300">{attempt.sectionTitle}</td>
                  <td className="py-1.5 font-mono">{Math.round(attempt.score * 100)}%</td>
                  <td
                    className={`py-1.5 font-medium ${
                      attempt.passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {attempt.passed ? "Passed" : "Failed"}
                  </td>
                  <td className="py-1.5 text-slate-400 dark:text-slate-500">
                    {attempt.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
