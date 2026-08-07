"use client";

import { useMemo, useState } from "react";
import { controlsForDataClass } from "@/lib/security-evaluators";

type DataClassification = "public" | "internal" | "confidential" | "restricted";
type ControlKey = "encryption" | "access" | "retention" | "audit" | "masking";

type ExampleField = {
  id: string;
  name: string;
  example: string;
  purpose: string;
  classification: DataClassification;
};

type CompletionItem = {
  id: string;
  label: string;
  detail: string;
};

const INITIAL_FIELDS: ExampleField[] = [
  {
    id: "account-id",
    name: "account_id",
    example: "acct_7F29D1",
    purpose: "Link activity to a customer account",
    classification: "internal",
  },
  {
    id: "email",
    name: "email_address",
    example: "alex@example.test",
    purpose: "Send account notifications",
    classification: "confidential",
  },
  {
    id: "payment-token",
    name: "payment_token",
    example: "tok_visa_••••4242",
    purpose: "Reference a vaulted payment method",
    classification: "restricted",
  },
  {
    id: "product-name",
    name: "product_name",
    example: "Network Fundamentals",
    purpose: "Display a catalog item",
    classification: "public",
  },
];

const COMPLETION_ITEMS: CompletionItem[] = [
  { id: "inventory", label: "Record the data inventory", detail: "Name fields, sources, owners, and systems of record." },
  { id: "purpose", label: "Document purpose and lawful basis", detail: "Tie collection and processing to a documented business purpose." },
  { id: "access", label: "Review access and sharing", detail: "Confirm least privilege, approved processors, and transfer boundaries." },
  { id: "retention", label: "Set retention and deletion evidence", detail: "Define the schedule and retain proof that deletion occurred." },
  { id: "incident", label: "Exercise the privacy incident path", detail: "Identify escalation owners and notification decision points." },
];

const CLASSIFICATION_STYLES: Record<DataClassification, string> = {
  public: "border-slate-200 bg-slate-50 text-slate-700",
  internal: "border-blue-200 bg-blue-50 text-blue-700",
  confidential: "border-amber-200 bg-amber-50 text-amber-700",
  restricted: "border-rose-200 bg-rose-50 text-rose-700",
};

const CONTROL_LABELS: Record<ControlKey, string> = {
  encryption: "Encryption",
  access: "Access",
  retention: "Retention",
  audit: "Audit",
  masking: "Masking",
};

export default function SecPrivacyComplianceSection() {
  const [fields, setFields] = useState<ExampleField[]>(INITIAL_FIELDS);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(INITIAL_FIELDS[1].id);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? fields[0];
  const selectedControls = useMemo(
    () => controlsForDataClass(selectedField?.classification ?? "internal"),
    [selectedField?.classification],
  );
  const completedCount = COMPLETION_ITEMS.filter((item) => completed[item.id]).length;

  const updateClassification = (classification: DataClassification) => {
    setFields((current) =>
      current.map((field) =>
        field.id === selectedFieldId ? { ...field, classification } : field,
      ),
    );
  };

  const toggleCompletion = (id: string) => {
    setCompleted((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <section id="sec-privacy-compliance" className="scroll-mt-20 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 card-shadow">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full border border-violet-400/30 bg-violet-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-violet-700">
            S14 · PRIVACY &amp; DATA CONTROLS
          </span>
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">14. Data Classification &amp; Privacy Controls</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Classify example fields, inspect the protection controls mapped to each class, and complete a
          practical privacy readiness checklist.
        </p>
        <p className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-900" role="note">
          Educational guidance only: this exercise is not formal legal compliance advice and does not
          determine obligations under any specific privacy law or contract.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 card-shadow xl:col-span-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Example data inventory</h4>
            <p className="mt-1 text-xs text-slate-500">Choose a field, then classify it according to its sensitivity and use.</p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[540px] text-left text-xs">
              <caption className="sr-only">Example fields and data classifications</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2.5">Field</th>
                  <th scope="col" className="px-3 py-2.5">Example value</th>
                  <th scope="col" className="px-3 py-2.5">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((field) => {
                  const selected = field.id === selectedFieldId;
                  return (
                    <tr key={field.id} className={selected ? "bg-violet-50/60" : "hover:bg-slate-50"}>
                      <td className="px-3 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => setSelectedFieldId(field.id)}
                          aria-label={`Select ${field.name}`}
                          className="text-left font-mono font-semibold text-violet-800 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          {field.name}
                        </button>
                        <p className="mt-1 text-[10px] text-slate-500">{field.purpose}</p>
                      </td>
                      <td className="px-3 py-3 align-top font-mono text-slate-700">{field.example}</td>
                      <td className="px-3 py-3 align-top">
                        <span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase ${CLASSIFICATION_STYLES[field.classification]}`}>
                          {field.classification}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <fieldset className="rounded-lg border border-violet-200 bg-violet-50/50 p-4">
            <legend className="px-1 text-xs font-bold text-violet-900">Classify {selectedField?.name ?? "selected field"}</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["public", "internal", "confidential", "restricted"] as const).map((classification) => (
                <label
                  key={classification}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition ${
                    selectedField?.classification === classification
                      ? "border-violet-500 bg-white text-violet-800 ring-2 ring-violet-200"
                      : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="data-classification"
                    value={classification}
                    checked={selectedField?.classification === classification}
                    onChange={() => updateClassification(classification)}
                    className="h-3.5 w-3.5 accent-violet-700"
                  />
                  {classification}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 card-shadow xl:col-span-2" aria-live="polite">
          <div>
            <p className="text-[11px] font-mono font-semibold uppercase tracking-wide text-violet-700">Evaluator-backed controls</p>
            <h4 className="mt-1 text-base font-bold text-slate-900">
              {selectedField?.name ?? "Selected field"} · {selectedField?.classification ?? "internal"}
            </h4>
            <p className="mt-1 text-xs text-slate-500">Controls update when the classification changes.</p>
          </div>
          <dl className="space-y-3">
            {(Object.keys(CONTROL_LABELS) as ControlKey[]).map((key) => (
              <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="text-xs font-bold text-slate-700">{CONTROL_LABELS[key]}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-600">{selectedControls[key]}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 card-shadow">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Privacy readiness checklist</h4>
            <p className="mt-1 text-xs text-slate-500">Use the checklist to turn classification into operating controls.</p>
          </div>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800" role="status" aria-live="polite">
            {completedCount}/{COMPLETION_ITEMS.length} complete
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {COMPLETION_ITEMS.map((item) => (
            <label
              key={item.id}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                completed[item.id]
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-200 bg-slate-50 hover:border-violet-300"
              }`}
            >
              <input
                type="checkbox"
                checked={Boolean(completed[item.id])}
                onChange={() => toggleCompletion(item.id)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
              />
              <span>
                <span className="block text-xs font-semibold text-slate-900">{item.label}</span>
                <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{item.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
