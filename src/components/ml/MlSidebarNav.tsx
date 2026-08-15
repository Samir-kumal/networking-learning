"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CURRICULUM } from "@/lib/ml/curriculum";
import { useProgressStore } from "@/lib/ml/store/progressStore";
import type { SectionStatus } from "@/lib/ml/progress/service";

const STATUS_ICON: Record<SectionStatus, string> = {
  locked: "\u{1F512}",
  unlocked: "\u25B7",
  completed: "\u2705",
};

const STATUS_LABEL: Record<SectionStatus, string> = {
  locked: "Locked",
  unlocked: "In progress",
  completed: "Completed",
};

/**
 * /ml-specific sidebar navigation: a real multi-page chapter/section tree (unlike
 * the rest of this app's tracks, which are single scrollable pages with hash-anchor
 * nav items). Section lock state comes from useProgressStore, hydrated per-request
 * by <ProgressHydrator> in src/app/ml/layout.tsx.
 */
export default function MlSidebarNav({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
  const map = useProgressStore((state) => state.map);

  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
      {!isCollapsed && (
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-2 px-1">
          ML Foundations Lab
        </p>
      )}
      {CURRICULUM.map((chapter) => (
        <div key={chapter.slug}>
          {!isCollapsed && (
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 px-1 mb-1 mt-3">
              {chapter.order}. {chapter.title}
            </p>
          )}
          <div className="space-y-0.5">
            {chapter.sections.map((section) => {
              const sectionId = `${chapter.slug}/${section.slug}`;
              const status = map[sectionId] ?? "locked";
              const href = `/ml/${chapter.slug}/${section.slug}`;
              const isActive = pathname === href;
              const isLocked = status === "locked";

              const content = (
                <>
                  <span
                    className={`flex-shrink-0 w-1 h-4 rounded-full transition-all ${
                      isActive ? "bg-indigo-500" : "bg-transparent"
                    }`}
                  />
                  <span className="text-[13px] flex-shrink-0" title={STATUS_LABEL[status]}>
                    {STATUS_ICON[status]}
                  </span>
                  {!isCollapsed && <span className="truncate">{section.title}</span>}
                </>
              );

              const className = `group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-all ${
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium"
                  : isLocked
                    ? "text-slate-400 dark:text-slate-600 cursor-not-allowed"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200"
              }`;

              if (isLocked) {
                return (
                  <div key={section.slug} className={className} title="Complete the previous section's quiz to unlock">
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={section.slug}
                  href={href}
                  title={isCollapsed ? section.title : undefined}
                  className={className}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
