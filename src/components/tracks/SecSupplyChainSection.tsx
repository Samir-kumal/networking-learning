"use client";

import { useMemo, useState } from "react";
import { evaluateSbom, type Severity } from "@/lib/security-evaluators";

type Dependency = {
  name: string;
  version: string;
  severity: Severity | "none";
  pinned: boolean;
  signed: boolean;
  license: string;
};

const DEPENDENCIES: Dependency[] = [
  {
    name: "express",
    version: "4.19.2",
    severity: "high",
    pinned: true,
    signed: true,
    license: "MIT",
  },
  {
    name: "lodash",
    version: "4.17.21",
    severity: "medium",
    pinned: true,
    signed: true,
    license: "Apache-2.0",
  },
  {
    name: "axios",
    version: "^1.7.2",
    severity: "low",
    pinned: false,
    signed: true,
    license: "MIT",
  },
  {
    name: "internal-plugin",
    version: "2.1.0",
    severity: "none",
    pinned: true,
    signed: false,
    license: "Apache-2.0",
  },
  {
    name: "legacy-parser",
    version: "1.4.0",
    severity: "none",
    pinned: true,
    signed: true,
    license: "GPL-3.0",
  },
];

const LICENSE_OPTIONS = ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC"] as const;
const ALL_LICENSES = Array.from(new Set(DEPENDENCIES.map((dependency) => dependency.license)));

const SEVERITY_CLASSES: Record<Severity | "none", string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-sky-200 bg-sky-50 text-sky-700",
  none: "border-slate-200 bg-slate-50 text-slate-500",
};

const VERDICT_CLASSES = {
  PASS: "border-emerald-200 bg-emerald-50 text-emerald-800",
  WARN: "border-amber-200 bg-amber-50 text-amber-800",
  BLOCK: "border-rose-200 bg-rose-50 text-rose-800",
} as const;


export default function SecSupplyChainSection() {
  const [allowLicenses, setAllowLicenses] = useState<string[]>(["MIT", "Apache-2.0"]);

  const evaluation = useMemo(
    () => evaluateSbom({ dependencies: DEPENDENCIES, allowLicenses }),
    [allowLicenses],
  );

  const toggleLicense = (license: string) => {
    setAllowLicenses((current) =>
      current.includes(license)
        ? current.filter((item) => item !== license)
        : [...current, license],
    );
  };

  return (
    <section id="sec-supply-chain" className="scroll-mt-20 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-violet-700">
          S11 · Software Supply Chain
        </span>
        <h3 className="mt-2 text-lg font-bold text-slate-900">Dependency and SBOM analyzer</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Inspect package provenance, vulnerability severity, immutable versions, signatures, and
          license policy before an artifact enters the release pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Package inventory</h4>
              <p className="mt-1 text-xs text-slate-500">
                The evaluator re-checks every row whenever the license policy changes.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-mono font-semibold text-slate-600">
              {DEPENDENCIES.length} packages
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[680px] text-left text-[11px]">
              <caption className="sr-only">Software bill of materials package inventory</caption>
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Package</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Version</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Severity</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Provenance</th>
                  <th scope="col" className="px-3 py-2 font-semibold">License</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DEPENDENCIES.map((dependency) => (
                  <tr key={dependency.name} className="text-slate-600">
                    <th scope="row" className="px-3 py-3 font-semibold text-slate-800">
                      {dependency.name}
                    </th>
                    <td className={`px-3 py-3 font-mono ${dependency.pinned ? "text-slate-600" : "text-amber-700"}`}>
                      {dependency.version}
                      {!dependency.pinned && <span className="ml-1 font-sans text-[10px]">(unpinned)</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_CLASSES[dependency.severity]}`}>
                        {dependency.severity}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={dependency.signed ? "text-emerald-700" : "text-rose-700"}>
                        {dependency.signed ? "Signed" : "Unsigned"}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono">{dependency.license}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <fieldset>
            <legend className="text-sm font-bold text-slate-900">License allowlist</legend>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Only selected SPDX licenses may ship. Toggle a license to re-run the SBOM policy.
            </p>
            <div className="mt-3 space-y-2">
              {LICENSE_OPTIONS.map((license) => (
                <label
                  key={license}
                  htmlFor={`sec-supply-license-${license.toLowerCase().replaceAll(".", "-")}`}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 hover:border-slate-300"
                >
                  <input
                    id={`sec-supply-license-${license.toLowerCase().replaceAll(".", "-")}`}
                    type="checkbox"
                    checked={allowLicenses.includes(license)}
                    onChange={() => toggleLicense(license)}
                    className="accent-indigo-600"
                  />
                  <span className="font-mono">{license}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg border p-4 ${VERDICT_CLASSES[evaluation.verdict]}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-75">
                  Release policy
                </span>
                <span className="mt-1 block text-sm font-bold">{evaluation.verdict.charAt(0) + evaluation.verdict.slice(1).toLowerCase()}</span>
              </div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                {evaluation.verdict}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed">
              {evaluation.findings.length === 0
                ? "All dependencies satisfy the configured SBOM controls."
                : `${evaluation.findings.length} finding${evaluation.findings.length === 1 ? "" : "s"} require attention before release.`}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Evaluator findings</h4>
            {evaluation.findings.length > 0 ? (
              <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600">
                {evaluation.findings.map((finding) => (
                  <li key={finding} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {finding}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                No vulnerability, provenance, signature, or license findings.
              </p>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            Allowlist currently contains {allowLicenses.length} of {ALL_LICENSES.length} licenses seen in the inventory.
          </p>
        </div>
      </div>
    </section>
  );
}
