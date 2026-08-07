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
        `$ vault read secret/data/production/db_credentials\nKey                 Value\n---                 -----\ncreated_time        2026-08-08T10:15:00Z\nlease_id            database/creds/readonly/s.v6X991a...\nlease_duration      1h\nlease_renewable     true\nusername            v-app-user-9481\npassword            ${
          isSecretMasked ? "••••••••••••••••" : "VaultP@ss_x89$21!qZ"
        }`
      );
    } else {
      setSecretLog(
        `$ aws secretsmanager get-secret-value --secret-id prod/db/credentials\n{\n  "ARN": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/db/credentials-a8X",\n  "Name": "prod/db/credentials",\n  "VersionId": "b48f912c-9011-411a",\n  "SecretString": "{\"user\":\"admin\",\"password\":\"${
          isSecretMasked ? "••••••••••••••••" : "AWS_KMS_Rotated_Secret#99!"
        }\"}",\n  "CreatedDate": "2026-08-08T09:00:00Z"\n}`
      );
    }
  };

  const handleRotateSecret = () => {
    setRotationTimer(3600);
    setSecretLog(
      `🔄 ROTATION TRIGGERED (${secretProvider.toUpperCase()})\n[1] Generated new random 32-byte high-entropy password.\n[2] Executed ALTER USER in PostgreSQL database instance.\n[3] Re-encrypted secret payload using KMS Key ID (arn:aws:kms:us-east-1:key/a1b2c3d4).\n[4] Staged new secret VersionId: v-${Date.now()}.\n[5] Invalidated old lease tokens. Rotation Complete!`
    );
  };

  return (
    <section id="sec-vault" className="scroll-mt-20 space-y-6">
      {/* Section Header Card */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-300/40 text-xs font-mono font-semibold">
            S3 · Secrets &amp; Vault Flow
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          3. Secret Management Workflow (HashiCorp Vault vs AWS Secrets Manager)
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Compare enterprise secret engine architecture, dynamic credential generation, token TTL leases, and automated rotation.
        </p>
      </div>

      {/* Architecture Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* HashiCorp Vault */}
        <div className="p-5 rounded-xl bg-white border border-violet-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔐</span>
              <h4 className="text-base font-bold text-slate-900">
                HashiCorp Vault
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-50 text-violet-700 border border-violet-200 font-bold">
              MULTI-CLOUD / ON-PREM
            </span>
          </div>
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-violet-500">•</span>
              <span>
                <strong>Encryption:</strong> Shamir Secret Sharing, Transit Secrets Engine (EaaS).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-500">•</span>
              <span>
                <strong>Dynamic Secrets:</strong> Generates short-lived DB credentials (e.g. 1h TTL) on-demand.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-500">•</span>
              <span>
                <strong>Auth Methods:</strong> AppRole, Kubernetes ServiceAccount JWT, TLS Certificates.
              </span>
            </li>
          </ul>
        </div>

        {/* AWS Secrets Manager */}
        <div className="p-5 rounded-xl bg-white border border-amber-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">☁️</span>
              <h4 className="text-base font-bold text-slate-900">
                AWS Secrets Manager
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 font-bold">
              AWS NATIVE
            </span>
          </div>
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              <span>
                <strong>Encryption:</strong> Envelope Encryption integrated with AWS KMS keys.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              <span>
                <strong>Automated Rotation:</strong> Native AWS Lambda rotation templates for RDS, Redshift, DocumentDB.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              <span>
                <strong>Auth Methods:</strong> IAM Policies, STS Temporary Credentials, VPC Endpoints.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Interactive Lifecycle Steps */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-slate-900">
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
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
          {secretLifecycleStep === 1 && (
            <p>
              <strong>Storage &amp; KMS Encryption:</strong> Secrets are encrypted using AES-256-GCM. In Vault, master keys are unsealed via Shamir threshold key shares. In AWS, KMS Envelope Encryption wraps data keys.
            </p>
          )}
          {secretLifecycleStep === 2 && (
            <p>
              <strong>Authentication &amp; Token Binding:</strong> Applications authenticate via IAM Roles (AWS) or Kubernetes ServiceAccount Tokens (Vault). Tokens carry strict ACL policies and automatically expire.
            </p>
          )}
          {secretLifecycleStep === 3 && (
            <p>
              <strong>Dynamic Credential Leasing:</strong> Instead of static passwords, Vault dynamically creates temporary DB users (<code>v-app-user-x89</code>) valid for 1 hour. Lease renewal is required to maintain access.
            </p>
          )}
          {secretLifecycleStep === 4 && (
            <p>
              <strong>Automated Rotation &amp; SIEM Audit:</strong> Lambda rotators update DB user passwords on a 30-day schedule without application downtime. Every fetch/rotation is logged to AWS CloudTrail / Vault Audit Logs.
            </p>
          )}
        </div>
      </div>

      {/* Interactive Live Secret Simulator */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>💻</span> Secret Fetch &amp; Rotation Simulator
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Select Provider:
            </label>
            <select
              value={secretProvider}
              onChange={(e) =>
                setSecretProvider(e.target.value as "vault" | "aws")
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
            >
              <option value="vault">HashiCorp Vault (AppRole / KV v2)</option>
              <option value="aws">AWS Secrets Manager (KMS)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">
              Secret Identifier Path:
            </label>
            <input
              type="text"
              value={secretPath}
              onChange={(e) => setSecretPath(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Fix Issue 3: text-white (not text-slate-900) on bg-indigo-600 */}
          <button
            onClick={handleFetchSecret}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-all"
          >
            Fetch Secret Payload
          </button>

          {/* Fix Issue 4: use semantic amber action color */}
          <button
            onClick={handleRotateSecret}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-all"
          >
            Trigger Immediate Rotation
          </button>

          <button
            onClick={() => setIsSecretMasked(!isSecretMasked)}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-xs hover:text-slate-900 hover:border-slate-300 transition-all"
          >
            {isSecretMasked ? "👁️ Unmask Tokens" : "🙈 Mask Tokens"}
          </button>

          <div className="ml-auto text-xs font-mono text-emerald-600">
            Lease TTL: {rotationTimer}s remaining
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
