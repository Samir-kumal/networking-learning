"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// ============================================================================
// AMAZON STEP FUNCTIONS & EVENT-DRIVEN ORCHESTRATION
// Visual state-machine builder: palette → workflow diagram → ASL JSON → simulator
// ============================================================================

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export type StepType = "Task" | "Choice" | "Parallel" | "Wait" | "CatchRetry";

interface BaseStep {
  id: string;
  type: StepType;
  name: string;
  /** Explicit transition to the next state (ASL `Next`). null = End. */
  nextId: string | null;
}

export interface TaskStep extends BaseStep {
  type: "Task";
  resource: string; // key into RESOURCES
  functionName: string; // Lambda function name (used when resource === "lambda")
  simulateError: boolean; // runtime-only flag for the execution simulator
}

export interface ChoiceStep extends BaseStep {
  type: "Choice";
  variable: "$.amount" | "$.itemType";
  operator: ">=" | "<" | "==" | "!=";
  value: string;
  /** Step to jump to when the condition matches ("" = fall back to the default path). */
  targetId: string;
}

export interface ParallelStep extends BaseStep {
  type: "Parallel";
  branches: string[]; // branch task labels, each becomes a mini state machine
}

export interface WaitStep extends BaseStep {
  type: "Wait";
  seconds: number;
}

export interface CatchRetryStep extends BaseStep {
  type: "CatchRetry";
  maxAttempts: number;
  intervalSeconds: number;
  backoffRate: number;
  /** Step to route to after retries are exhausted ("" = no fallback). */
  fallbackId: string;
}

export type WorkflowStep = TaskStep | ChoiceStep | ParallelStep | WaitStep | CatchRetryStep;

type SimStatus = "pending" | "running" | "success" | "error";
type SimFinal = "success" | "failed" | null;

interface SimLogEntry {
  id: number;
  text: string;
  kind: "title" | "info" | "ok" | "err" | "branch" | "retry" | "wait";
}

interface NodeRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
}

interface DiagramLayout {
  width: number;
  height: number;
  nodes: Record<string, NodeRect>;
}

interface DiagramEdge {
  d: string;
  color: "emerald" | "amber" | "rose" | "slate";
  dashed?: boolean;
}

interface EdgeLabel {
  x: number;
  y: number;
  text: string;
  color: string;
}

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const RESOURCES: Record<string, { label: string; arn: string; kind: "lambda" | "service" }> = {
  lambda: { label: "AWS Lambda (invoke)", arn: "arn:aws:states:::lambda:invoke", kind: "lambda" },
  dynamodb: { label: "DynamoDB (putItem)", arn: "arn:aws:states:::dynamodb:putItem", kind: "service" },
  sns: { label: "SNS (publish)", arn: "arn:aws:states:::sns:publish", kind: "service" },
  sqs: { label: "SQS (sendMessage)", arn: "arn:aws:states:::sqs:sendMessage", kind: "service" },
  ecs: { label: "ECS (runTask.sync)", arn: "arn:aws:states:::ecs:runTask.sync", kind: "service" },
  apigateway: { label: "API Gateway (invoke)", arn: "arn:aws:states:::apigateway:invoke", kind: "service" },
};

const BRANCH_TASKS = [
  "Update Inventory",
  "Charge Card",
  "Send Confirmation Email",
  "Store Thumbnail",
  "Update Metadata",
  "Load to Redshift",
  "Archive Raw Data",
  "Index Search Record",
  "Notify Admin",
  "Publish to SNS",
];

const AMOUNT_OPERATORS: ChoiceStep["operator"][] = [">=", "<", "==", "!="];
const STRING_OPERATORS: ChoiceStep["operator"][] = ["==", "!="];

const PALETTE: { type: StepType; icon: string; label: string; hint: string }[] = [
  { type: "Task", icon: "⚙️", label: "Task", hint: "invoke a Lambda / AWS service" },
  { type: "Choice", icon: "🔀", label: "Choice", hint: "branch on a condition" },
  { type: "Parallel", icon: "🪢", label: "Parallel", hint: "run branches concurrently" },
  { type: "Wait", icon: "⏱️", label: "Wait", hint: "delay by seconds" },
  { type: "CatchRetry", icon: "🛟", label: "Catch/Retry", hint: "attach error handling to a Task" },
];

const TYPE_STYLE: Record<StepType, { badge: string; chip: string }> = {
  Task: { badge: "bg-emerald-100 text-emerald-700 border-emerald-300", chip: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  Choice: { badge: "bg-amber-100 text-amber-700 border-amber-300", chip: "bg-amber-50 border-amber-200 text-amber-700" },
  Parallel: { badge: "bg-teal-100 text-teal-700 border-teal-300", chip: "bg-teal-50 border-teal-200 text-teal-700" },
  Wait: { badge: "bg-lime-100 text-lime-700 border-lime-300", chip: "bg-lime-50 border-lime-200 text-lime-700" },
  CatchRetry: { badge: "bg-rose-100 text-rose-700 border-rose-300", chip: "bg-rose-50 border-rose-200 text-rose-700" },
};

const EDGE_COLORS: Record<DiagramEdge["color"], string> = {
  emerald: "#059669",
  amber: "#d97706",
  rose: "#e11d48",
  slate: "#94a3b8",
};

const T_STATE = 600; // ms per state in the simulator
const T_RETRY = 400;
const T_WAIT_TICK = 250; // per simulated wait second

// ---------------------------------------------------------------------------
// STEP FACTORIES (module scope → deterministic ids, SSR/hydration safe)
// ---------------------------------------------------------------------------

let stepSeq = 0;
const sid = () => `s${++stepSeq}`;

const makeTask = (name: string, resource: string, functionName: string, simulateError: boolean): TaskStep => ({
  id: sid(),
  type: "Task",
  name,
  nextId: null,
  resource,
  functionName,
  simulateError,
});

const makeChoice = (name: string, variable: ChoiceStep["variable"], operator: ChoiceStep["operator"], value: string): ChoiceStep => ({
  id: sid(),
  type: "Choice",
  name,
  nextId: null,
  variable,
  operator,
  value,
  targetId: "",
});

const makeParallel = (name: string, branches: string[]): ParallelStep => ({
  id: sid(),
  type: "Parallel",
  name,
  nextId: null,
  branches,
});

const makeWait = (name: string, seconds: number): WaitStep => ({
  id: sid(),
  type: "Wait",
  name,
  nextId: null,
  seconds,
});

const makeCatch = (name: string, maxAttempts: number, intervalSeconds: number, backoffRate: number, fallbackId: string): CatchRetryStep => ({
  id: sid(),
  type: "CatchRetry",
  name,
  nextId: null,
  maxAttempts,
  intervalSeconds,
  backoffRate,
  fallbackId,
});

// --- Preset templates ------------------------------------------------------

const buildOrderPreset = (): WorkflowStep[] => {
  const validate = makeTask("Validate Order", "lambda", "validate-order-handler", false);
  const inventory = makeChoice("Check Inventory", "$.amount", ">=", "100");
  const payment = makeTask("Process Payment", "lambda", "charge-card-handler", true); // fails → demo retry/catch
  const ship = makeTask("Ship Order", "lambda", "ship-order-handler", false);
  const review = makeTask("Manual Review", "lambda", "manual-review-handler", false);
  const retry = makeCatch("Payment Retry & Catch", 3, 1, 2, review.id);

  validate.nextId = inventory.id;
  inventory.nextId = payment.id;
  inventory.targetId = review.id; // high-value orders → manual review
  payment.nextId = ship.id;
  ship.nextId = null;
  review.nextId = null;
  return [validate, inventory, payment, retry, ship, review];
};

const buildImagePreset = (): WorkflowStep[] => {
  const fetch = makeTask("Fetch Image", "lambda", "fetch-image-handler", false);
  const resize = makeTask("Resize Thumbnail", "lambda", "resize-thumbnail-handler", false);
  const sizes = makeChoice("Check Output Size", "$.itemType", "==", "poster");
  const parallel = makeParallel("Store & Index", ["Store Thumbnail", "Update Metadata"]);
  const wait = makeWait("S3 Consistency Delay", 3);
  const publish = makeTask("Publish to SNS", "sns", "", false);
  const notify = makeTask("Notify Admin", "sns", "", false);
  const retry = makeCatch("Fetch Retry & Catch", 2, 1, 2, notify.id);

  fetch.nextId = resize.id;
  resize.nextId = sizes.id;
  sizes.targetId = resize.id; // poster output → resize again (loop back)
  sizes.nextId = parallel.id;
  parallel.nextId = wait.id;
  wait.nextId = publish.id;
  publish.nextId = null;
  notify.nextId = null;
  return [fetch, retry, resize, sizes, parallel, wait, publish, notify];
};

const buildEtlPreset = (): WorkflowStep[] => {
  const extract = makeTask("Extract from S3", "lambda", "extract-from-s3", false);
  const transform = makeTask("Transform with Glue", "lambda", "run-glue-job", false);
  const load = makeParallel("Load & Archive", ["Load to Redshift", "Archive Raw Data"]);
  const check = makeChoice("Check Row Count", "$.amount", ">=", "10000");
  const email = makeTask("Send Success Email", "sns", "", false);
  const notify = makeTask("Notify Admin", "sns", "", false);

  extract.nextId = transform.id;
  transform.nextId = load.id;
  load.nextId = check.id;
  check.targetId = notify.id;
  check.nextId = email.id;
  email.nextId = null;
  notify.nextId = null;
  return [extract, transform, load, check, email, notify];
};

const TEMPLATES: { id: string; label: string; build: () => WorkflowStep[] }[] = [
  { id: "order", label: "Order Processing", build: buildOrderPreset },
  { id: "image", label: "Image Thumbnail Pipeline", build: buildImagePreset },
  { id: "etl", label: "ETL Batch Job", build: buildEtlPreset },
];

const INITIAL_STEPS = buildOrderPreset();

// ---------------------------------------------------------------------------
// ASL JSON GENERATOR
// ---------------------------------------------------------------------------

const genNames = (steps: WorkflowStep[]): Record<string, string> => {
  const used = new Set<string>();
  const out: Record<string, string> = {};
  for (const s of steps) {
    if (s.type === "CatchRetry") continue; // attaches to a Task, no state of its own
    let base = s.name.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!base) base = "Step";
    let n = base;
    let i = 2;
    while (used.has(n)) n = `${base}_${i++}`;
    used.add(n);
    out[s.id] = n;
  }
  return out;
};

const choiceComparison = (c: ChoiceStep): Record<string, unknown> => {
  const base = { Variable: c.variable };
  if (c.variable === "$.amount") {
    const v = parseFloat(c.value);
    const num = Number.isNaN(v) ? 0 : v;
    switch (c.operator) {
      case ">=":
        return { ...base, NumericGreaterThanEquals: num };
      case "<":
        return { ...base, NumericLessThan: num };
      case "==":
        return { ...base, NumericEquals: num };
      case "!=":
        return { Not: { ...base, NumericEquals: num } };
    }
  }
  const v = c.value || "";
  if (c.operator === "!=") return { Not: { ...base, StringEquals: v } };
  return { ...base, StringEquals: v };
};

const buildStateMachine = (
  steps: WorkflowStep[]
): { json: string; warnings: string[]; stateCount: number } => {
  const warnings: string[] = [];
  const real = steps.filter((s) => s.type !== "CatchRetry");
  const first = real[0];
  if (!first) {
    return {
      json: "{}",
      warnings: ["Add at least one Task, Choice, Parallel or Wait step to generate a state machine."],
      stateCount: 0,
    };
  }

  const names = genNames(steps);
  const states: Record<string, unknown> = {};
  let needSucceed = false;
  const succeed = () => {
    needSucceed = true;
    return "Succeed";
  };

  // Catch/Retry steps attach to the nearest preceding Task (ASL rule).
  const catchMap = new Map<string, CatchRetryStep>();
  let lastReal: WorkflowStep | undefined;
  for (const s of steps) {
    if (s.type === "CatchRetry") {
      if (!lastReal) warnings.push(`“${s.name}” has no preceding step to attach Retry/Catch to.`);
      else if (lastReal.type !== "Task")
        warnings.push(`“${s.name}” must attach to a Task — Retry/Catch are not valid on ${lastReal.type} states.`);
      else if (!catchMap.has(lastReal.id)) catchMap.set(lastReal.id, s);
      else warnings.push(`“${s.name}” ignored — a Catch/Retry already attaches to “${lastReal.name}”.`);
    } else lastReal = s;
  }

  for (const step of real) {
    const name = names[step.id];
    const nextName = step.nextId ? names[step.nextId] : undefined;
    const attachNext = (s: Record<string, unknown>) => {
      if (nextName) s.Next = nextName;
      else s.End = true;
    };

    switch (step.type) {
      case "Task": {
        const r = RESOURCES[step.resource] ?? RESOURCES.lambda;
        const s: Record<string, unknown> = { Type: "Task", Resource: r.arn };
        if (r.kind === "lambda") {
          s.Parameters = { FunctionName: step.functionName.trim() || "my-function", "Payload.$": "$" };
        }
        const catchStep = catchMap.get(step.id);
        if (catchStep) {
          s.Retry = [
            {
              ErrorEquals: ["States.ALL"],
              IntervalSeconds: catchStep.intervalSeconds,
              MaxAttempts: catchStep.maxAttempts,
              BackoffRate: catchStep.backoffRate,
            },
          ];
          const fbName = catchStep.fallbackId ? names[catchStep.fallbackId] : undefined;
          s.Catch = [{ ErrorEquals: ["States.ALL"], Next: fbName ?? succeed() }];
          if (!fbName)
            warnings.push(`“${catchStep.name}” has no fallback step — the machine ends via a Succeed state after retries.`);
        }
        if (catchStep && !nextName) s.Next = succeed(); // a state with Catch cannot End directly
        else attachNext(s);
        states[name] = s;
        break;
      }
      case "Choice": {
        const s: Record<string, unknown> = { Type: "Choice" };
        const comp = choiceComparison(step);
        const targetName = step.targetId ? names[step.targetId] : undefined;
        if (!targetName) warnings.push(`“${step.name}” has no condition target — the matching branch follows the default path.`);
        comp.Next = targetName ?? nextName ?? succeed();
        s.Choices = [comp];
        s.Default = nextName ?? succeed();
        if (!nextName) warnings.push(`“${step.name}” is the last state — a Succeed state was added as its Default path.`);
        if (targetName && targetName === s.Default)
          warnings.push(`“${step.name}” condition target equals its Default — both paths lead to the same state.`);
        states[name] = s;
        break;
      }
      case "Parallel": {
        const branches = (step.branches.length ? step.branches : ["Unnamed Branch"]).map((b) => ({
          StartAt: b,
          States: {
            [b]: {
              Type: "Task",
              Resource: "arn:aws:states:::lambda:invoke",
              Parameters: { FunctionName: b.toLowerCase().replace(/[^a-z0-9]+/g, "-"), "Payload.$": "$" },
              End: true,
            },
          },
        }));
        const s: Record<string, unknown> = { Type: "Parallel", Branches: branches };
        attachNext(s);
        states[name] = s;
        break;
      }
      case "Wait": {
        const s: Record<string, unknown> = { Type: "Wait", Seconds: Math.max(1, Math.min(300, Math.round(step.seconds))) };
        attachNext(s);
        states[name] = s;
        break;
      }
    }
  }

  if (needSucceed) states.Succeed = { Type: "Succeed" };

  const machine = {
    Comment: "Amazon States Language state machine — generated by SubnetLab Step Functions studio",
    StartAt: names[first.id],
    States: states,
  };
  return { json: JSON.stringify(machine, null, 2), warnings, stateCount: real.length };
};

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------

export default function AwsStepFunctionsSection() {
  // --- workflow state -------------------------------------------------------
  const [steps, setSteps] = useState<WorkflowStep[]>(INITIAL_STEPS);
  const [templateId, setTemplateId] = useState<string>("order");

  // --- simulator state ------------------------------------------------------
  const [simAmount, setSimAmount] = useState<string>("42");
  const [simItemType, setSimItemType] = useState<string>("books");
  const [simRunning, setSimRunning] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, SimStatus>>({});
  const [log, setLog] = useState<SimLogEntry[]>([]);
  const [finalStatus, setFinalStatus] = useState<SimFinal>(null);
  const abortRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  // --- diagram layout -------------------------------------------------------
  const diagramRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [layout, setLayout] = useState<DiagramLayout | null>(null);

  const realSteps = useMemo(() => steps.filter((s) => s.type !== "CatchRetry"), [steps]);

  const measure = () => {
    const container = diagramRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const nodes: Record<string, NodeRect> = {};
    const measureOne = (key: string, el: HTMLDivElement | null) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      nodes[key] = {
        top: r.top - cRect.top,
        left: r.left - cRect.left,
        width: r.width,
        height: r.height,
        bottom: r.bottom - cRect.top,
      };
    };
    measureOne("start", startRef.current);
    for (const s of steps) measureOne(s.id, nodeRefs.current[s.id]);
    setLayout({ width: cRect.width, height: cRect.height, nodes });
  };

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // --- derived data ---------------------------------------------------------
  const machine = useMemo(() => buildStateMachine(steps), [steps]);
  const nameOf = (id: string | null | undefined) => (id ? steps.find((s) => s.id === id)?.name : undefined);

  const catchMap = useMemo(() => {
    const m = new Map<string, CatchRetryStep>();
    let lastRealStep: WorkflowStep | undefined;
    for (const s of steps) {
      if (s.type === "CatchRetry") {
        if (lastRealStep && lastRealStep.type === "Task" && !m.has(lastRealStep.id)) m.set(lastRealStep.id, s);
      } else lastRealStep = s;
    }
    return m;
  }, [steps]);

  // --- diagram edges ---------------------------------------------------------
  const { edges, labels } = useMemo(() => {
    const edgesOut: DiagramEdge[] = [];
    const labelsOut: EdgeLabel[] = [];
    if (!layout) return { edges: edgesOut, labels: labelsOut };
    const rect = (id: string) => layout.nodes[id];
    const gx = layout.width - 14; // routing gutter on the right

    const straight = (from: NodeRect, to: NodeRect) => from.left === to.left && to.top >= from.bottom - 1;

    const pushEdge = (
      from: NodeRect,
      to: NodeRect,
      color: DiagramEdge["color"],
      label?: string,
      dashed = false
    ) => {
      if (straight(from, to)) {
        const x = from.left + from.width / 2;
        edgesOut.push({ d: `M ${x} ${from.bottom} V ${to.top}`, color });
        if (label) labelsOut.push({ x: x + 10, y: (from.bottom + to.top) / 2, text: label, color: EDGE_COLORS[color] });
        return;
      }
      // orthogonal elbow via the right gutter, entering the target's left edge
      const fromX = from.left + from.width / 2;
      const fromY = from.bottom;
      const toY = to.top + to.height / 2;
      edgesOut.push({
        d: `M ${fromX} ${fromY} V ${fromY + 10} H ${gx} V ${toY} H ${to.left}`,
        color,
        dashed,
      });
      if (label) labelsOut.push({ x: gx - 6, y: (fromY + 10 + toY) / 2, text: label, color: EDGE_COLORS[color] });
    };

    const startRect = rect("start");
    const first = realSteps[0];
    if (startRect && first) {
      const fr = rect(first.id);
      if (fr) pushEdge(startRect, fr, "emerald", "StartAt");
    }

    for (const s of realSteps) {
      const from = rect(s.id);
      if (!from) continue;
      if (s.nextId) {
        const to = rect(s.nextId);
        if (to) pushEdge(from, to, s.type === "Choice" ? "slate" : "emerald", s.type === "Choice" ? "default" : undefined);
      }
      if (s.type === "Choice" && s.targetId) {
        const to = rect(s.targetId);
        if (to) pushEdge(from, to, "amber", `${s.variable} ${s.operator} ${s.value}`);
      }
    }
    for (const c of steps) {
      if (c.type !== "CatchRetry" || !c.fallbackId) continue;
      const to = rect(c.fallbackId);
      if (!to) continue;
      const attachedId = [...catchMap.entries()].find(([, v]) => v.id === c.id)?.[0];
      const fromRect = attachedId ? rect(attachedId) : rect(c.id);
      if (fromRect) pushEdge(fromRect, to, "rose", `catch → ${nameOf(c.fallbackId) ?? c.fallbackId}`, true);
    }
    return { edges: edgesOut, labels: labelsOut };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, steps, realSteps, catchMap]);

  // --- step mutations -------------------------------------------------------
  const stepCounters = useRef<Record<string, number>>({});
  const createStep = (type: StepType): WorkflowStep => {
    stepCounters.current[type] = (stepCounters.current[type] ?? 0) + 1;
    const n = stepCounters.current[type];
    switch (type) {
      case "Task":
        return makeTask(`Task ${n}`, "lambda", "", false);
      case "Choice":
        return makeChoice(`Choice ${n}`, "$.amount", ">=", "100");
      case "Parallel":
        return makeParallel(`Parallel ${n}`, ["Update Inventory", "Send Confirmation Email"]);
      case "Wait":
        return makeWait(`Wait ${n}`, 5);
      case "CatchRetry":
        return makeCatch(`Retry & Catch ${n}`, 3, 1, 2, "");
    }
  };

  const addStep = (type: StepType) => {
    setSteps((prev) => {
      const newStep = createStep(type);
      if (type === "CatchRetry") return [...prev, newStep]; // attaches to preceding Task
      const lastRealStep = [...prev].reverse().find((s) => s.type !== "CatchRetry");
      const wired = lastRealStep
        ? prev.map((s) => (s.id === lastRealStep.id ? { ...s, nextId: newStep.id } : s))
        : prev;
      return [...wired, newStep];
    });
  };

  const removeStep = (id: string) => {
    setSteps((prev) => {
      const removed = prev.find((s) => s.id === id);
      const rest = prev.filter((s) => s.id !== id);
      const nextOf = removed && removed.type !== "CatchRetry" ? removed.nextId : null;
      return rest.map((s) => {
        if (s.type === "CatchRetry") return s.fallbackId === id ? { ...s, fallbackId: "" } : s;
        if (s.type === "Choice")
          return {
            ...s,
            nextId: s.nextId === id ? nextOf : s.nextId,
            targetId: s.targetId === id ? "" : s.targetId,
          };
        return s.nextId === id ? { ...s, nextId: nextOf } : s;
      });
    });
  };

  const moveStep = (id: string, dir: -1 | 1) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });
  };

  type StepPatch =
    | Partial<TaskStep>
    | Partial<ChoiceStep>
    | Partial<ParallelStep>
    | Partial<WaitStep>
    | Partial<CatchRetryStep>;

  const updateStep = (id: string, patch: StepPatch) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        // StepPatch restricts keys to the step's own type, so the merged object is a valid WorkflowStep.
        return { ...s, ...patch } as unknown as WorkflowStep;
      })
    );
  };

  const applyTemplate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setSteps(t.build());
    setStatuses({});
    setLog([]);
    setFinalStatus(null);
  };

  const clearAll = () => {
    setSteps([]);
    setStatuses({});
    setLog([]);
    setFinalStatus(null);
  };

  // --- simulator ------------------------------------------------------------
  const sleep = (ms: number): Promise<void> => {
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, ms);
    return promise;
  };

  const evalChoice = (c: ChoiceStep, amount: number, itemType: string): boolean => {
    const v = c.value.trim();
    if (c.variable === "$.amount") {
      const num = parseFloat(v);
      if (Number.isNaN(num)) return false;
      switch (c.operator) {
        case ">=":
          return amount >= num;
        case "<":
          return amount < num;
        case "==":
          return amount === num;
        case "!=":
          return amount !== num;
      }
    }
    if (c.operator === "==") return itemType === v;
    return itemType !== v;
  };

  const runSimulation = async () => {
    if (simRunning) return;
    abortRef.current = false;
    setSimRunning(true);
    setFinalStatus(null);
    setStatuses({});
    setLog([]);
    const log: SimLogEntry[] = [];
    const push = (text: string, kind: SimLogEntry["kind"] = "info") => {
      log.push({ id: log.length + 1, text, kind });
      setLog([...log]);
    };
    const statuses: Record<string, SimStatus> = {};
    const set = (id: string, st: SimStatus) => {
      statuses[id] = st;
      setStatuses({ ...statuses });
    };
    const byId = new Map(steps.map((s) => [s.id, s]));
    const real = steps.filter((s) => s.type !== "CatchRetry");
    const first = real[0];

    if (!first) {
      push("No states to execute — add steps first.", "err");
      setSimRunning(false);
      setFinalStatus("failed");
      return;
    }

    push(`Starting execution — StartAt: ${first.name}`, "title");
    const amount = parseFloat(simAmount) || 0;
    const itemType = simItemType;

    let cur: WorkflowStep | undefined = first;
    let hops = 0;
    const maxHops = real.length * 6 + 20;
    let outcome: "success" | "failed" = "success";

    outer: while (cur && hops < maxHops) {
      hops++;
      if (abortRef.current) {
        push("⏹ execution aborted", "err");
        outcome = "failed";
        break;
      }
      if (cur.type === "CatchRetry") {
        cur = cur.nextId ? byId.get(cur.nextId) : undefined;
        continue;
      }
      set(cur.id, "running");
      push(`→ ${cur.name} (${cur.type})`, "info");
      await sleep(T_STATE);

      switch (cur.type) {
        case "Task": {
          const attached = catchMap.get(cur.id);
          if (cur.simulateError) {
            if (attached) {
              for (let a = 1; a <= attached.maxAttempts; a++) {
                push(`✗ attempt ${a}/${attached.maxAttempts} failed — ${RESOURCES[cur.resource]?.label ?? cur.resource}`, "err");
                await sleep(Math.min(300 * Math.pow(attached.backoffRate, a - 1), 1200));
                push(`↻ backoff ${(attached.intervalSeconds * Math.pow(attached.backoffRate, a - 1)).toFixed(1)}s`, "retry");
                if (a < attached.maxAttempts) {
                  set(cur.id, "running");
                  await sleep(T_RETRY);
                }
              }
              set(cur.id, "error");
              if (attached.fallbackId && byId.has(attached.fallbackId)) {
                const fb = byId.get(attached.fallbackId)!;
                push(`⚠ retries exhausted — Catch routes to “${fb.name}”`, "branch");
                await sleep(T_STATE);
                set(fb.id, "running");
                cur = fb;
                continue;
              }
              push("✗ retries exhausted with no Catch fallback — execution FAILED", "err");
              outcome = "failed";
              break outer;
            }
            push(`✗ ${cur.name} failed — no Retry/Catch configured`, "err");
            outcome = "failed";
            break outer;
          }
          push(`✓ ${cur.name}: ${RESOURCES[cur.resource]?.label ?? cur.resource} completed`, "ok");
          set(cur.id, "success");
          break;
        }
        case "Choice": {
          const hit = evalChoice(cur, amount, itemType);
          const target = hit && cur.targetId ? byId.get(cur.targetId) : undefined;
          push(`${cur.variable} ${cur.operator} ${cur.value} → ${hit ? "TRUE" : "FALSE"}`, "branch");
          set(cur.id, "success");
          if (target) {
            push(`↪ jumping to “${target.name}”`, "branch");
            cur = target;
          } else {
            cur = cur.nextId ? byId.get(cur.nextId) : undefined;
          }
          continue;
        }
        case "Parallel": {
          for (const b of cur.branches) push(`⇉ starting branch: ${b}`, "info");
          await sleep(T_STATE / 2);
          for (const b of cur.branches) push(`✓ branch “${b}” completed`, "ok");
          set(cur.id, "success");
          break;
        }
        case "Wait": {
          for (let s = cur.seconds; s > 0; s--) {
            push(`⏳ waiting… ${s}s remaining`, "wait");
            await sleep(T_WAIT_TICK);
          }
          set(cur.id, "success");
          break;
        }
      }
      cur = cur.nextId ? byId.get(cur.nextId) : undefined;
    }

    if (hops >= maxHops) {
      push("⚠ step budget exhausted — possible infinite loop (check Choice targets)", "err");
      outcome = "failed";
    }
    setSimRunning(false);
    setFinalStatus(outcome);
    push(
      outcome === "success" ? "✔ EXECUTION COMPLETED — every state reached a terminal path" : "✘ EXECUTION FAILED",
      outcome === "success" ? "ok" : "err"
    );
  };

  const resetSimulation = () => {
    abortRef.current = true;
    setStatuses({});
    setLog([]);
    setFinalStatus(null);
    setSimRunning(false);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(machine.json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  const [copied, setCopied] = useState(false);

  // --- small render helpers -------------------------------------------------
  const statusDot = (id: string) => {
    const st = statuses[id] ?? "pending";
    const cls =
      st === "success"
        ? "bg-emerald-500"
        : st === "running"
        ? "bg-amber-400 animate-pulse"
        : st === "error"
        ? "bg-rose-500"
        : "bg-slate-300";
    return <span className={`ml-auto h-2.5 w-2.5 rounded-full shrink-0 ${cls}`} title={st} />;
  };

  const endPill = () => (
    <span className="ml-auto text-[9px] font-mono font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded px-1.5 py-0.5">
      END
    </span>
  );

  const nodeClass = (s: WorkflowStep): string => {
    const st = statuses[s.id] ?? "pending";
    const ring =
      st === "success"
        ? "ring-2 ring-emerald-400"
        : st === "running"
        ? "ring-2 ring-amber-400 animate-pulse"
        : st === "error"
        ? "ring-2 ring-rose-400"
        : "";
    if (s.type === "CatchRetry") {
      return `relative z-10 ml-12 w-[calc(100%-96px)] bg-rose-50/50 border-2 border-dashed border-rose-300 rounded-xl p-3 shadow-sm transition-all ${ring}`;
    }
    return `relative z-10 w-[calc(100%-24px)] bg-white border border-slate-300 rounded-xl p-3 shadow-sm transition-all ${ring}`;
  };

  const renderNodeBody = (s: WorkflowStep) => {
    switch (s.type) {
      case "Task": {
        const r = RESOURCES[s.resource];
        return (
          <div className="flex items-start gap-2">
            <span className="h-7 w-7 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
              λ
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-900 truncate">{s.name}</span>
                {!s.nextId && endPill()}
                {statusDot(s.id)}
              </div>
              <div className="mt-1 text-[10px] font-mono text-slate-500 truncate">{r?.label ?? s.resource}</div>
              {s.resource === "lambda" && s.functionName && (
                <div className="text-[10px] font-mono text-emerald-600 truncate">ƒ {s.functionName}</div>
              )}
              {s.simulateError && <div className="text-[10px] font-mono text-rose-500">⚠ simulator injects failure here</div>}
            </div>
          </div>
        );
      }
      case "Choice": {
        const targetName = nameOf(s.targetId);
        const nextName = nameOf(s.nextId);
        return (
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rotate-45 border-2 border-amber-400 bg-amber-50 rounded-sm flex items-center justify-center shadow-sm">
              <span className="-rotate-45 text-amber-600 font-mono font-bold text-sm">?</span>
            </div>
            <div className="mt-2 text-center text-[10px] font-mono leading-relaxed">
              <div className="text-amber-700 font-bold">if {s.variable} {s.operator} {s.value} → {targetName ?? "default"}</div>
              <div className="text-slate-400">else → {nextName ?? "END"}</div>
            </div>
          </div>
        );
      }
      case "Parallel": {
        const n = Math.max(1, s.branches.length);
        const laneX = (i: number) => (n === 1 ? 50 : 15 + (70 * i) / (n - 1));
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-teal-100 border border-teal-300 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                ⑂
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 truncate">{s.name}</span>
              {!s.nextId && endPill()}
              {statusDot(s.id)}
            </div>
            <div className="relative h-24 mt-2 w-full">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {s.branches.map((_, i) => (
                  <g key={i}>
                    <path
                      d={`M 50 3 V 9 H ${laneX(i)} V 15`}
                      stroke="#14b8a6"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                      fill="none"
                    />
                    <path d={`M ${laneX(i)} 15 V 85`} stroke="#14b8a6" strokeWidth={1.5} vectorEffect="non-scaling-stroke" fill="none" />
                    <path
                      d={`M ${laneX(i)} 85 V 91 H 50 V 97`}
                      stroke="#14b8a6"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                      fill="none"
                      markerEnd="url(#arr-teal)"
                    />
                  </g>
                ))}
              </svg>
              {s.branches.map((b, i) => (
                <span
                  key={i}
                  className="absolute top-[16%] -translate-x-1/2 max-w-[42%] truncate text-center bg-teal-50 border border-teal-200 text-teal-700 rounded px-1.5 py-0.5 text-[9px] font-mono"
                  style={{ left: `${laneX(i)}%` }}
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        );
      }
      case "Wait":
        return (
          <div className="flex items-start gap-2">
            <span className="h-7 w-7 rounded-full bg-lime-100 border border-lime-300 text-lime-700 flex items-center justify-center text-xs font-bold shrink-0">
              ⏱
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-900 truncate">{s.name}</span>
                {!s.nextId && endPill()}
                {statusDot(s.id)}
              </div>
              <div className="mt-1 text-[10px] font-mono text-slate-500">Seconds: {s.seconds}</div>
            </div>
          </div>
        );
      case "CatchRetry": {
        const fbName = nameOf(s.fallbackId);
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-rose-100 border border-rose-300 text-rose-600 flex items-center justify-center text-xs shrink-0">
                🛟
              </span>
              <span className="text-xs font-mono font-bold text-rose-700 truncate">{s.name}</span>
              {statusDot(s.id)}
            </div>
            <div className="mt-1 pl-9 text-[10px] font-mono text-rose-600">
              retry {s.maxAttempts}× · interval {s.intervalSeconds}s · backoff ×{s.backoffRate.toFixed(1)}
            </div>
            <div className="pl-9 text-[10px] font-mono text-slate-500">
              {fbName ? `catch → ${fbName}` : "no fallback — task fails after retries"}
            </div>
          </div>
        );
      }
    }
  };

  const realOptionList = (excludeId: string) =>
    realSteps.filter((s) => s.id !== excludeId);

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <section
      id="step-functions"
      className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 space-y-8 shadow-xl hover:border-emerald-400/40 transition-colors"
    >
      {/* ---------------------------------------------------------------- */}
      {/* HEADER */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="text-xs font-mono text-emerald-600 uppercase tracking-wider mb-1">
            Serverless Orchestration / Amazon Step Functions
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
            <span>🧩</span> Step Functions &amp; Event-Driven Orchestration
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-slate-500">Workflow:</span>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {machine.stateCount} states · {steps.length} items
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-600 text-white">
            {machine.json === "{}" ? "INCOMPLETE" : "VALID ASL"}
          </span>
        </div>
      </div>

      <p className="text-sm text-slate-500 leading-relaxed">
        Amazon Step Functions builds <strong className="text-slate-900">state machines</strong> in the{" "}
        <strong className="text-slate-900">Amazon States Language (ASL)</strong> to orchestrate Lambda functions and AWS
        services. States transition via <strong className="text-slate-900">Next</strong> pointers, fan out with{" "}
        <strong className="text-slate-900">Parallel</strong>, branch on data with <strong className="text-slate-900">Choice</strong>,
        and recover from failures with <strong className="text-slate-900">Retry / Catch</strong> — build a workflow below, read the
        generated ASL JSON, then watch it execute step by step.
      </p>

      {/* Key concepts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            t: "State Machine",
            d: "A directed graph of states defined in ASL. Every state declares a Next transition or ends the machine.",
            c: "border-emerald-200 bg-emerald-50/50",
          },
          {
            t: "Standard vs Express",
            d: "Standard: up to 1 year, exactly-once, auditable. Express: up to 5 minutes, at-least-once, high throughput.",
            c: "border-teal-200 bg-teal-50/50",
          },
          {
            t: "Retry & Catch",
            d: "Retry applies backoff policies for transient errors. Catch routes failures to a fallback state instead of failing.",
            c: "border-rose-200 bg-rose-50/50",
          },
          {
            t: "Event-Driven Triggers",
            d: "Start executions from EventBridge rules, API Gateway, S3 events, SQS, or the StartExecution SDK call.",
            c: "border-amber-200 bg-amber-50/50",
          },
        ].map((k) => (
          <div key={k.t} className={`p-4 rounded-xl border ${k.c} space-y-1.5`}>
            <div className="text-xs font-mono font-bold text-slate-900">{k.t}</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">{k.d}</p>
          </div>
        ))}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* BUILDER + DIAGRAM */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* --- Editor column --- */}
        <div className="lg:col-span-3 space-y-6">
          {/* Palette */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
                <span>🧱</span> Step Palette
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value);
                    applyTemplate(e.target.value);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      Template: {t.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={clearAll}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border border-slate-300 text-slate-500 hover:bg-white transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PALETTE.map((p) => (
                <button
                  key={p.type}
                  onClick={() => addStep(p.type)}
                  className="group text-left bg-white border border-slate-200 hover:border-emerald-400 rounded-lg p-2.5 transition-colors"
                >
                  <div className="text-xs font-mono font-bold text-slate-900">
                    <span className="mr-1">{p.icon}</span>
                    {p.label}
                    <span className="float-right text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">+</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{p.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step list */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
              <span>📋</span> Workflow Editor
              <span className="ml-auto text-[10px] font-mono text-slate-400">Next/End transitions mirror ASL</span>
            </h3>
            {steps.length === 0 && (
              <div className="text-center text-xs font-mono text-slate-400 py-8 border border-dashed border-slate-300 rounded-xl">
                No steps yet — click a palette tile above to add your first state.
              </div>
            )}
            {steps.map((s, i) => (
              <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-slate-400 w-5 shrink-0">#{i + 1}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${TYPE_STYLE[s.type].badge} shrink-0`}
                  >
                    {PALETTE.find((p) => p.type === s.type)?.icon} {s.type}
                  </span>
                  <input
                    value={s.name}
                    onChange={(e) => updateStep(s.id, { name: e.target.value })}
                    className="flex-1 min-w-[120px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                    placeholder="State name"
                  />
                  {statusDot(s.id)}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveStep(s.id, -1)}
                      disabled={i === 0}
                      className="h-6 w-6 rounded border border-slate-200 text-slate-500 text-xs font-mono disabled:opacity-30 hover:bg-slate-50"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveStep(s.id, 1)}
                      disabled={i === steps.length - 1}
                      className="h-6 w-6 rounded border border-slate-200 text-slate-500 text-xs font-mono disabled:opacity-30 hover:bg-slate-50"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeStep(s.id)}
                      className="h-6 w-6 rounded border border-rose-200 text-rose-500 text-xs font-mono hover:bg-rose-50"
                      title="Delete step"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* --- type-specific config --- */}
                {s.type === "Task" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Resource</label>
                      <select
                        value={s.resource}
                        onChange={(e) => updateStep(s.id, { resource: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                      >
                        {Object.entries(RESOURCES).map(([k, r]) => (
                          <option key={k} value={k}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {s.resource === "lambda" && (
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Function name</label>
                        <input
                          value={s.functionName}
                          onChange={(e) => updateStep(s.id, { functionName: e.target.value })}
                          placeholder="my-function"
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}
                    <div className={s.resource === "lambda" ? "" : "sm:col-span-2"}>
                      <button
                        onClick={() => updateStep(s.id, { simulateError: !s.simulateError })}
                        className={`w-full px-2 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                          s.simulateError
                            ? "bg-rose-500/10 text-rose-600 border-rose-300"
                            : "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                        }`}
                      >
                        {s.simulateError ? "⚠ Simulator injects failure (on)" : "✓ Simulator succeeds (default)"}
                      </button>
                    </div>
                  </div>
                )}

                {s.type === "Choice" && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-7">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Variable</label>
                      <select
                        value={s.variable}
                        onChange={(e) => {
                          const variable = e.target.value as ChoiceStep["variable"];
                          updateStep(s.id, {
                            variable,
                            operator: variable === "$.amount" ? (s.operator === "==" || s.operator === "!=" ? s.operator : ">=") : "==",
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="$.amount">$.amount (number)</option>
                        <option value="$.itemType">$.itemType (string)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Operator</label>
                      <select
                        value={s.operator}
                        onChange={(e) => updateStep(s.id, { operator: e.target.value as ChoiceStep["operator"] })}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                      >
                        {(s.variable === "$.amount" ? AMOUNT_OPERATORS : STRING_OPERATORS).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Value</label>
                      <input
                        value={s.value}
                        onChange={(e) => updateStep(s.id, { value: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Match → jump to</label>
                      <select
                        value={s.targetId}
                        onChange={(e) => updateStep(s.id, { targetId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">Default path</option>
                        {realOptionList(s.id).map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {s.type === "Parallel" && (
                  <div className="space-y-2 pl-7">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-mono text-slate-400">Branches</label>
                      <select
                        value={s.branches.length}
                        onChange={(e) => {
                          const count = parseInt(e.target.value, 10);
                          if (count === 2) updateStep(s.id, { branches: s.branches.slice(0, 2) });
                          else if (count === 3) {
                            const used = new Set(s.branches);
                            const extra = BRANCH_TASKS.find((b) => !used.has(b)) ?? "Extra Branch";
                            updateStep(s.id, { branches: [...s.branches, extra] });
                          }
                        }}
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                      <span className="text-[10px] font-mono text-slate-400">branches run concurrently and rejoin</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {s.branches.map((b, bi) => (
                        <div key={bi}>
                          <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Branch {bi + 1}</label>
                          <select
                            value={b}
                            onChange={(e) =>
                              updateStep(s.id, { branches: s.branches.map((x, xi) => (xi === bi ? e.target.value : x)) })
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                          >
                            {BRANCH_TASKS.filter((t) => t === b || !s.branches.includes(t)).map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {s.type === "Wait" && (
                  <div className="pl-7 flex items-center gap-2">
                    <label className="text-[10px] font-mono text-slate-400">Seconds</label>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={s.seconds}
                      onChange={(e) => updateStep(s.id, { seconds: Math.max(1, Math.min(300, parseInt(e.target.value, 10) || 1)) })}
                      className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-[10px] font-mono text-slate-400">(generated as Seconds in ASL)</span>
                  </div>
                )}

                {s.type === "CatchRetry" && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-7">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Max attempts</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={s.maxAttempts}
                        onChange={(e) =>
                          updateStep(s.id, { maxAttempts: Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1)) })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Interval (s)</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={s.intervalSeconds}
                        onChange={(e) =>
                          updateStep(s.id, {
                            intervalSeconds: Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 1)),
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Backoff rate</label>
                      <input
                        type="number"
                        min={1}
                        max={3}
                        step={0.5}
                        value={s.backoffRate}
                        onChange={(e) =>
                          updateStep(s.id, { backoffRate: Math.max(1, Math.min(3, parseFloat(e.target.value) || 1)) })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Catch → fallback</label>
                      <select
                        value={s.fallbackId}
                        onChange={(e) => updateStep(s.id, { fallbackId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">None (fail after retries)</option>
                        {realOptionList(s.id).map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* --- Next transition --- */}
                {s.type !== "CatchRetry" && (
                  <div className="flex items-center gap-2 pl-7 pt-1 border-t border-slate-100">
                    <label className="text-[10px] font-mono text-slate-400">Next →</label>
                    <select
                      value={s.nextId ?? ""}
                      onChange={(e) => updateStep(s.id, { nextId: e.target.value || null })}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">End</option>
                      {realOptionList(s.id).map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* --- Diagram column --- */}
        <div className="lg:col-span-2">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 h-full">
            <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2 mb-1">
              <span>🗺️</span> Workflow Diagram
            </h3>
            <p className="text-[10px] font-mono text-slate-400 mb-3">
              Live view — arrows follow each state&apos;s Next transition
            </p>

            <div className="flex items-center gap-3 mb-3 text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> success
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> running
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> error
              </span>
            </div>

            <div ref={diagramRef} className="relative">
              {/* START node */}
              <div
                ref={startRef}
                className="relative z-10 w-[calc(100%-24px)] flex justify-center pb-1"
              >
                <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[8px] font-mono font-bold shadow-md">
                  START
                </div>
              </div>

              <div className="space-y-6 pt-1">
                {realSteps.map((s) => (
                  <div
                    key={s.id}
                    ref={(el) => {
                      nodeRefs.current[s.id] = el;
                    }}
                    className={nodeClass(s)}
                  >
                    {renderNodeBody(s)}
                  </div>
                ))}
                {realSteps.length === 0 && (
                  <div className="text-center text-xs font-mono text-slate-400 py-10 border border-dashed border-slate-300 rounded-xl">
                    No states yet — add steps from the palette
                  </div>
                )}
              </div>

              {/* edge overlay */}
              {layout && realSteps.length > 0 && (
                <svg
                  className="absolute left-0 top-0 pointer-events-none"
                  width={layout.width}
                  height={layout.height}
                  style={{ overflow: "visible" }}
                >
                  <defs>
                    {(Object.keys(EDGE_COLORS) as DiagramEdge["color"][]).map((c) => (
                      <marker
                        key={c}
                        id={`arr-${c}`}
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLORS[c]} />
                      </marker>
                    ))}
                    <marker id="arr-teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#14b8a6" />
                    </marker>
                  </defs>
                  {edges.map((e, i) => (
                    <path
                      key={i}
                      d={e.d}
                      fill="none"
                      stroke={EDGE_COLORS[e.color]}
                      strokeWidth={1.5}
                      strokeDasharray={e.dashed ? "5 4" : undefined}
                      markerEnd={`url(#arr-${e.color})`}
                    />
                  ))}
                </svg>
              )}
              {labels.map((l, i) => (
                <div
                  key={i}
                  className="absolute z-20 px-1.5 py-0.5 rounded bg-white/95 border border-slate-200 text-[9px] font-mono whitespace-nowrap shadow-sm"
                  style={{ left: l.x, top: l.y, transform: "translate(-100%, -50%)", color: l.color }}
                >
                  {l.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* JSON + SIMULATOR */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- ASL JSON --- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>📄 State Machine JSON (Amazon States Language)</span>
            <button
              onClick={copyJson}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                copied
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              {copied ? "✓ Copied" : "Copy JSON"}
            </button>
          </div>
          <textarea
            readOnly
            value={machine.json}
            rows={18}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-emerald-700 focus:border-emerald-400 focus:outline-none leading-relaxed"
          />
          {machine.warnings.length > 0 && (
            <div className="space-y-1.5">
              {machine.warnings.map((w, i) => (
                <div
                  key={i}
                  className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-1.5 text-[11px] font-mono"
                >
                  ⚠ {w}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- Simulator --- */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 font-mono border-b border-slate-200 pb-2 flex items-center gap-2">
            <span>▶</span> Execution Simulator
          </h3>

          <div className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
            Simulated input to <span className="text-emerald-700">StartExecution</span>:{" "}
            <span className="text-slate-800">
              {"{"} &quot;amount&quot;: {simAmount || "0"}, &quot;itemType&quot;: &quot;{simItemType}&quot; {"}"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">$.amount (number)</label>
              <input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">$.itemType (string)</label>
              <select
                value={simItemType}
                onChange={(e) => setSimItemType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="books">books</option>
                <option value="electronics">electronics</option>
                <option value="clothing">clothing</option>
                <option value="poster">poster</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={runSimulation}
              disabled={simRunning}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-lg text-xs font-mono transition-colors shadow-md"
            >
              {simRunning ? "⏳ Executing…" : "▶ Run Execution"}
            </button>
            <button
              onClick={resetSimulation}
              disabled={simRunning}
              className="px-4 py-2.5 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg text-xs font-mono hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              Reset
            </button>
          </div>

          {finalStatus && (
            <div
              className={`p-3 rounded-xl border text-xs font-mono font-bold ${
                finalStatus === "success"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-rose-50 border-rose-300 text-rose-600"
              }`}
            >
              {finalStatus === "success" ? "✔ EXECUTION SUCCEEDED" : "✘ EXECUTION FAILED"}
            </div>
          )}

          <div
            ref={logRef}
            className="h-64 overflow-y-auto bg-slate-900 rounded-xl p-3 space-y-1 font-mono text-[11px] leading-relaxed"
          >
            {log.length === 0 && (
              <div className="text-slate-500">// press Run Execution to trace the state machine step by step</div>
            )}
            {log.map((l) => (
              <div
                key={l.id}
                className={
                  l.kind === "title"
                    ? "text-emerald-400 font-bold"
                    : l.kind === "ok"
                    ? "text-emerald-400"
                    : l.kind === "err"
                    ? "text-rose-400"
                    : l.kind === "branch"
                    ? "text-amber-300"
                    : l.kind === "retry"
                    ? "text-amber-300 italic"
                    : l.kind === "wait"
                    ? "text-slate-400"
                    : "text-slate-300"
                }
              >
                {l.text}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            Tip: set a Task&apos;s simulator toggle to inject a failure, then re-run to watch Retry backoff and Catch
            routing. Set $.itemType to <span className="font-mono">poster</span> in the Image Thumbnail template to see a
            Choice loop back.
          </p>
        </div>
      </div>
    </section>
  );
}
