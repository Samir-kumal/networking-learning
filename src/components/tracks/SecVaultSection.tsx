"use client";

import { useState } from "react";

export default function SecVaultSection() {
  // --- Secrets & Vault State ---
  const [secretProvider, setSecretProvider] = useState<"vault" | "aws">("vault");
  const [secretPath, setSecretPath] = useState<string>(
    "secret/data/production/db_credentials"
  );
  const [secretLifecycleStep, setSecretLifecycleStep] = useState<number>(1);
  const [isSecretMasked, setIsSecretMasked] = useState<boolean>(true);
  const [secretLog, setSecretLog] = useState<string | null>(null);
  const [rotationTimer, setRotationTimer] = useState<number>(3600);

  const handleFetchSecret = () => {
    if (secretProvider === "vault") {
      setSecretLog(
        `$ vault read ${secretPath}\nKey                 Value\n---                 -----\ncreated_time        2026-08-08T10:15:00Z\nlease_id            database/creds/readonly/demo-lease\nlease_duration      1h\nlease_renewable     true\nusername            v-app-user-demo\npassword            ${
          isSecretMasked ? "••••••••••••••••" : "<demo-secret-not-real>"
        }`
      );
    } else {
      setSecretLog(
        `$ aws secretsmanager get-secret-value --secret-id ${secretPath}\n{\n  "ARN": "arn:aws:secretsmanager:us-east-1:123456789012:secret:demo",\n  "Name": "${secretPath}",\n  "VersionId": "demo-version",\n  "SecretString": "{\"user\":\"demo-user\",\"password\":\"${
          isSecretMasked ? "••••••••••••••••" : "<demo-secret-not-real>"
        }\"}",\n  "CreatedDate": "2026-08-08T09:00:00Z"\n}`
      );
    }
  };

  const handleRotateSecret = () => {
    setRotationTimer(3600);
    setSecretLog(
      secretProvider === "vault"
        ? `LOCAL SIMULATION — VAULT ROTATION\n[1] Requested a new dynamic database credential for ${secretPath}.\n[2] The configured database role would create a short-lived credential.\n[3] The new lease would be returned to the authorized client.\n[4] The old lease would be revoked when expired or explicitly revoked.`
        : `LOCAL SIMULATION — AWS SECRETS MANAGER ROTATION\n[1] Staged an AWSPENDING secret version for ${secretPath}.\n[2] A configured managed rotation workflow or Lambda would update the target service.\n[3] The pending credential would be tested before promotion.\n[4] The service would move the version to AWSCURRENT after a successful rotation.`
    );
  };

  return (
    <section id="sec-vault" className="scroll-mt-20 space-y-6">
      {/* Section Header Card */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border border-violet-300/40 text-xs font-mono font-semibold">
            S3 · Secrets &amp; Vault Flow
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          3. Secret Management Workflow (HashiCorp Vault vs AWS Secrets Manager)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Compare provider-specific secret storage, dynamic credential leases, access policy, and rotation workflows. The controls below are a local simulation.
        </p>
      </div>

      {/* Architecture Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* HashiCorp Vault */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔐</span>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                HashiCorp Vault
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 font-bold">
              MULTI-CLOUD / ON-PREM
            </span>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-violet-500 dark:text-violet-400">•</span>
              <span>
                <strong>Key protection:</strong> Shamir shares can protect Vault unseal operations; the Transit engine is a separate encryption service.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-500 dark:text-violet-400">•</span>
              <span>
                <strong>Dynamic secrets:</strong> A configured database role can issue short-lived credentials, such as a one-hour example lease.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-500 dark:text-violet-400">•</span>
              <span>
                <strong>Authentication:</strong> AppRole, Kubernetes, TLS, and other methods are available depending on the enabled auth configuration.
              </span>
            </li>
          </ul>
        </div>

        {/* AWS Secrets Manager */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">☁️</span>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                AWS Secrets Manager
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 font-bold">
              AWS NATIVE
            </span>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 dark:text-amber-400">•</span>
              <span>
                <strong>Encryption:</strong> Secrets Manager uses envelope encryption with a 256-bit AES data key protected by AWS KMS.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 dark:text-amber-400">•</span>
              <span>
                <strong>Rotation:</strong> Managed rotation or a configured Lambda workflow updates both the secret and its target service.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 dark:text-amber-400">•</span>
              <span>
                <strong>Access:</strong> IAM policies authorize API calls; a VPC endpoint can constrain the network path but is not an authentication method.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Interactive Lifecycle Steps */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Secret Lifecycle Pipeline
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          {[
            { step: 1, label: "1. Ingestion & Encryption" },
            { step: 2, label: "2. App Auth & STS" },
            { step: 3, label: "3. Dynamic Fetch & TTL" },
            { step: 4, label: "4. Rotation & Audit" },
          ].map((s) => (
            <button
              key={s.step}
              onClick={() => setSecretLifecycleStep(s.step)}
              className={`p-3 rounded-lg border text-xs font-semibold text-left transition-all ${
                secretLifecycleStep === s.step
                  ? "bg-indigo-600 text-white font-bold border-indigo-600 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {secretLifecycleStep === 1 && (
            <p>
              <strong>Storage &amp; key protection:</strong> Encryption details depend on the configured Vault seal/storage and AWS KMS settings. Shamir shares protect an unseal workflow; AWS Secrets Manager uses KMS envelope encryption.
            </p>
          )}
          {secretLifecycleStep === 2 && (
            <p>
              <strong>Authentication &amp; policy:</strong> The application authenticates using a configured Vault auth method or AWS IAM credentials. Policies limit access; expiry and renewal depend on the issued token or lease.
            </p>
          )}
          {secretLifecycleStep === 3 && (
            <p>
              <strong>Dynamic credential leasing:</strong> Vault database roles can create temporary users with configured TTLs. Lease renewal and revocation behavior depends on the role and database plugin configuration.
            </p>
          )}
          {secretLifecycleStep === 4 && (
            <p>
              <strong>Rotation &amp; audit:</strong> Rotation schedules are configuration-specific. AWS records service activity in CloudTrail, and Vault audit devices record requests when enabled; neither guarantees that a downstream credential update succeeds without testing.
            </p>
          )}
        </div>
      </div>

      {/* Interactive Live Secret Simulator */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>💻</span> Secret Fetch &amp; Rotation Simulator
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Select Provider:
            </label>
            <select
              value={secretProvider}
              onChange={(e) =>
                setSecretProvider(e.target.value as "vault" | "aws")
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono"
            >
              <option value="vault">HashiCorp Vault (AppRole / KV v2)</option>
              <option value="aws">AWS Secrets Manager (KMS)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Secret Identifier Path:
            </label>
            <input
              type="text"
              value={secretPath}
              onChange={(e) => setSecretPath(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleFetchSecret}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all"
          >
            Show simulated secret payload
          </button>

          <button
            onClick={handleRotateSecret}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 dark:hover:bg-amber-500 text-white font-semibold text-xs transition-all"
          >
            Simulate rotation workflow
          </button>

          <button
            onClick={() => setIsSecretMasked(!isSecretMasked)}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
          >
            {isSecretMasked ? "👁️ Show demo placeholder" : "🙈 Mask demo placeholder"}
          </button>

          <div className="ml-auto text-xs font-mono text-emerald-600 dark:text-emerald-400">
            Illustrative lease TTL: {rotationTimer}s
          </div>
        </div>

        {secretLog && (
          <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700 text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap">
            {secretLog}
          </pre>
        )}
      </div>
    </section>
  );
}
