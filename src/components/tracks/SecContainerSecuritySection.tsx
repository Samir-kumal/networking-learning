"use client";

import { useMemo, useState } from "react";
import { evaluateContainerAdmission } from "@/lib/security-evaluators";

type AdmissionControls = {
  nonRoot: boolean;
  readOnlyRoot: boolean;
  droppedCapabilities: boolean;
  hostNetwork: boolean;
  hostPath: boolean;
  signedImage: boolean;
  resourceLimits: boolean;
};

type ControlDefinition = {
  key: keyof AdmissionControls;
  label: string;
  description: string;
};

const CONTROL_DEFINITIONS: ControlDefinition[] = [
  {
    key: "nonRoot",
    label: "Run as non-root user",
    description: "The workload uses an unprivileged UID instead of root.",
  },
  {
    key: "readOnlyRoot",
    label: "Read-only root filesystem",
    description: "The image root filesystem cannot be modified at runtime.",
  },
  {
    key: "droppedCapabilities",
    label: "Drop Linux capabilities",
    description: "Unneeded kernel capabilities are removed from the container.",
  },
  {
    key: "hostNetwork",
    label: "Use host networking",
    description: "Disabled means the pod remains isolated from the node network namespace.",
  },
  {
    key: "hostPath",
    label: "Mount host paths",
    description: "Disabled means the workload cannot mount arbitrary node filesystem paths.",
  },
  {
    key: "signedImage",
    label: "Require a signed image",
    description: "The registry signature is verified before the image is admitted.",
  },
  {
    key: "resourceLimits",
    label: "Set CPU and memory limits",
    description: "The workload declares CPU and memory limits to bound resource consumption.",
  },
];

const REMEDIATIONS: Record<string, string> = {
  "Container must run as a non-root user.": "Set a pod or image securityContext with runAsNonRoot: true and a non-zero runAsUser.",
  "Container root filesystem must be read-only.": "Set securityContext.readOnlyRootFilesystem: true and mount explicit writable volumes where needed.",
  "Linux capabilities must be dropped by default.": "Configure capabilities.drop: [\"ALL\"] and add back only a documented minimum.",
  "Host networking is not permitted.": "Remove hostNetwork: true and expose the service through a cluster Service or ingress.",
  "Host path mounts are not permitted.": "Remove hostPath volumes and use an approved persistent volume or projected secret instead.",
  "Image signature verification is required.": "Sign the image in CI and configure admission policy to verify its registry signature.",
  "CPU and memory limits are required.": "Declare CPU and memory requests and limits in the workload specification.",
};

const DEFAULT_CONTROLS: AdmissionControls = {
  nonRoot: false,
  readOnlyRoot: false,
  droppedCapabilities: true,
  hostNetwork: true,
  hostPath: true,
  signedImage: false,
  resourceLimits: false,
};

export default function SecContainerSecuritySection() {
  const [controls, setControls] = useState<AdmissionControls>(DEFAULT_CONTROLS);

  const evaluation = useMemo(() => evaluateContainerAdmission(controls), [controls]);

  const setControl = (key: keyof AdmissionControls, value: boolean) => {
    setControls((current) => ({ ...current, [key]: value }));
  };

  return (
    <section id="sec-container-security" className="scroll-mt-20 space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <span className="rounded-full border border-cyan-200 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 px-2.5 py-0.5 text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-300">
          S12 · Container Security
        </span>
        <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">Container admission simulator</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Toggle workload controls to model a custom strict admission policy. This is not the built-in
          Kubernetes Pod Security Standards profile: image signatures and resource limits require separate
          policy tooling.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <fieldset>
            <legend className="text-sm font-bold text-slate-900 dark:text-slate-100">Pod security controls</legend>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Enable each control that is enforced by your workload policy. Host access controls
              are secure when their toggles remain off.
            </p>
            <div className="mt-4 space-y-2">
              {CONTROL_DEFINITIONS.map((control) => (
                <label
                  key={control.key}
                  htmlFor={`sec-container-${control.key}`}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-3 text-xs text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                >
                  <input
                    id={`sec-container-${control.key}`}
                    type="checkbox"
                    checked={controls[control.key]}
                    onChange={(event) => setControl(control.key, event.target.checked)}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <span>
                    <span className="block font-semibold text-slate-800 dark:text-slate-200">{control.label}</span>
                    <span className="mt-0.5 block leading-relaxed text-slate-500 dark:text-slate-400">{control.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="space-y-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg border p-4 ${evaluation.admitted ? "border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200" : "border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-75">
                  Admission decision
                </span>
                <span className="mt-1 block text-sm font-bold">
                  {evaluation.admitted ? "Admitted" : "Rejected"}
                </span>
              </div>
              <span className="rounded-full bg-white/70 dark:bg-slate-800/70 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                {evaluation.admitted ? "ALLOW" : "DENY"}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed">
              {evaluation.admitted
                ? "All required workload controls pass the admission policy."
                : `${evaluation.findings.length} control${evaluation.findings.length === 1 ? "" : "s"} failed and must be remediated.`}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Failed controls</h4>
            {evaluation.findings.length > 0 ? (
              <ul className="mt-2 space-y-3">
                {evaluation.findings.map((finding) => (
                  <li key={finding} className="rounded-lg border border-rose-200 dark:border-rose-700 bg-rose-50/60 dark:bg-rose-900/30 p-3">
                    <p className="text-xs font-semibold leading-relaxed text-rose-900 dark:text-rose-200">{finding}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Remediation:</span>{" "}
                      {REMEDIATIONS[finding] ?? "Review the workload security context and apply the required control."}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 rounded-lg border border-dashed border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 p-3 text-xs text-emerald-800 dark:text-emerald-200">
                No failed controls. This workload is ready for admission.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700 p-3">
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">Controls passing</span>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                {CONTROL_DEFINITIONS.length - evaluation.findings.length}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700 p-3">
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">Controls failed</span>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{evaluation.findings.length}</span>
            </div>
            <div className="col-span-2 rounded-lg bg-slate-50 dark:bg-slate-700 p-3">
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">Policy mode</span>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">Strict admission</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
