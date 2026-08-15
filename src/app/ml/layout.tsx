import type { ReactNode } from "react";
import { requireProfile } from "@/lib/ml/auth/session";
import { getProgressMap } from "@/lib/ml/progress/service";
import ProgressHydrator from "@/components/ml/ProgressHydrator";

export default async function MlLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const progressMap = await getProgressMap(profile.id);

  return (
    <>
      <ProgressHydrator initialMap={progressMap} />
      {children}
    </>
  );
}
