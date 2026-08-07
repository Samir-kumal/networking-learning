"use client";

import { useState } from "react";

// ==========================================
// TYPES
// ==========================================

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type IntegrationType = "lambda" | "http" | "dynamodb" | "mock";
type AuthorizerType = "NONE" | "IAM" | "LAMBDA" | "COGNITO";

interface ApiRoute {
  id: number;
  path: string;
  method: HttpMethod;
  integration: IntegrationType;
  authorizer: AuthorizerType;
  cacheEnabled: boolean;
  validate: boolean;
}

interface UseCase {
  label: string;
  rec: "REST API" | "HTTP API";
  reason: string;
}

// ==========================================
// CONSTANTS & MOCK DATA
// ==========================================

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: "bg-emerald-50 text-emerald-600 border-emerald-200",
  POST: "bg-amber-50 text-amber-600 border-amber-200",
  PUT: "bg-sky-50 text-sky-600 border-sky-200",
  DELETE: "bg-rose-50 text-rose-600 border-rose-200",
};

const METHOD_RING: Record<HttpMethod, string> = {
  GET: "ring-emerald-300",
  POST: "ring-amber-300",
  PUT: "ring-sky-300",
  DELETE: "ring-rose-300",
};

const INTEGRATION_LABELS: Record<IntegrationType, string> = {
  lambda: "Lambda (AWS_PROXY)",
  http: "HTTP Proxy",
  dynamodb: "DynamoDB (AWS Service)",
  mock: "Mock Response",
};

const AUTHORIZER_LABELS: Record<AuthorizerType, string> = {
  NONE: "No Auth",
  IAM: "IAM (SigV4)",
  LAMBDA: "Lambda Token",
  COGNITO: "Cognito User Pools",
};

const USE_CASES: UseCase[] = [
  {
    label: "Serverless CRUD (Lambda + DynamoDB)",
    rec: "HTTP API",
    reason:
      "HTTP APIs are cheaper and faster for straightforward Lambda/DynamoDB proxy integrations, with native JWT/OIDC authorizers when you need them.",
  },
  {
    label: "WebSocket chat / live updates",
    rec: "REST API",
    reason:
      "Only REST APIs support WebSocket endpoints with connection management (Connect / Disconnect / SendMessage routes).",
  },
  {
    label: "Public API with API keys & quotas",
    rec: "REST API",
    reason:
      "Usage plans, API keys, and per-client throttling quotas are REST-only features — HTTP APIs have no usage plans.",
  },
  {
    label: "High-volume IoT telemetry",
    rec: "HTTP API",
    reason:
      "HTTP APIs are ~10-30% faster with lower latency and cost $1.00/M requests vs $3.50/M for REST — ideal for massive request volumes.",
  },
  {
    label: "Internal microservice with IAM auth",
    rec: "HTTP API",
    reason:
      "IAM/SigV4 authorization, VPC Links, and private integrations are fully supported on HTTP APIs at lower cost.",
  },
  {
    label: "Canary deployments & traffic shifting",
    rec: "REST API",
    reason:
      "REST API stages support canary releases with traffic weights and CloudWatch metrics; HTTP APIs do not.",
  },
];

const DEFAULT_ROUTES: ApiRoute[] = [
  { id: 1, path: "/pets", method: "GET", integration: "lambda", authorizer: "IAM", cacheEnabled: true, validate: true },
  { id: 2, path: "/pets", method: "POST", integration: "lambda", authorizer: "COGNITO", cacheEnabled: false, validate: true },
  { id: 3, path: "/pets/{petId}", method: "DELETE", integration: "lambda", authorizer: "LAMBDA", cacheEnabled: false, validate: false },
];

const CACHE_CAPACITY_TIERS = ["0.5", "1.6", "6.1", "13.5", "28.4", "58.2", "118", "237"];

// ==========================================
// HELPERS
// ==========================================

const formatNum = (n: number) => new Intl.NumberFormat("en-US").format(n);

/** Security-scheme key used in both `components.securitySchemes` and per-operation `security`. */
const AUTH_SCHEME_KEYS: Record<Exclude<AuthorizerType, "NONE">, string> = {
  IAM: "sigv4_auth",
  LAMBDA: "lambda_authorizer",
  COGNITO: "cognito_user_pools",
};

/** Minimal YAML serializer for the OpenAPI spec (objects / arrays / scalars). */
const yamlify = (obj: unknown, indent: number): string => {
  const pad = "  ".repeat(indent);
  if (obj === null) return "null";
  if (typeof obj === "string") return JSON.stringify(obj);
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const entries = Object.entries(item as Record<string, unknown>);
          const [firstKey, firstVal] = entries[0];
          const rest = entries.slice(1);
          let out = `${pad}- ${firstKey}:`;
          if (Array.isArray(firstVal)) {
            out += firstVal.length === 0 ? " []" : `\n${yamlify(firstVal, indent + 2)}`;
          } else if (typeof firstVal === "object" && firstVal !== null) {
            out += `\n${yamlify(firstVal, indent + 2)}`;
          } else {
            out += ` ${yamlify(firstVal, indent + 2)}`;
          }
          for (const [k, v] of rest) {
            if (Array.isArray(v)) {
              out += v.length === 0 ? `\n${pad}  ${k}: []` : `\n${pad}  ${k}:\n${yamlify(v, indent + 3)}`;
            } else if (typeof v === "object" && v !== null) {
              out += `\n${pad}  ${k}:\n${yamlify(v, indent + 3)}`;
            } else {
              out += `\n${pad}  ${k}: ${yamlify(v, indent + 3)}`;
            }
          }
          return out;
        }
        return `${pad}- ${yamlify(item, indent + 1)}`;
      })
      .join("\n");
  }
  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) return "{}";
  return entries
    .map(([k, v]) => {
      if (v === null) return `${pad}${k}: null`;
      if (typeof v === "object") {
        return `${pad}${k}:\n${yamlify(v, indent + 1)}`;
      }
      return `${pad}${k}: ${yamlify(v, indent + 1)}`;
    })
    .join("\n");
};

// ==========================================
// COMPONENT
// ==========================================

export default function AwsApiGatewaySection() {
  // ---------- Module 2: Route Builder State ----------
  const [routes, setRoutes] = useState<ApiRoute[]>(DEFAULT_ROUTES);
  const [nextId, setNextId] = useState<number>(4);
  const [pathInput, setPathInput] = useState<string>("/pets/{petId}");
  const [methodInput, setMethodInput] = useState<HttpMethod>("GET");
  const [integrationInput, setIntegrationInput] = useState<IntegrationType>("lambda");
  const [authorizerInput, setAuthorizerInput] = useState<AuthorizerType>("IAM");
  const [cacheInput, setCacheInput] = useState<boolean>(false);
  const [validateInput, setValidateInput] = useState<boolean>(true);
  const [pathError, setPathError] = useState<string | null>(null);
  const [apiId] = useState<string>(() => "a" + Math.random().toString(36).slice(2, 11));
  const [apiName, setApiName] = useState<string>("PetStore");

  // ---------- Module 3: Authorizer Configuration State ----------
  const [authType, setAuthType] = useState<AuthorizerType>("COGNITO");
  const [lambdaTokenSource, setLambdaTokenSource] = useState<string>("Authorization");
  const [lambdaTtl, setLambdaTtl] = useState<number>(300);
  const [lambdaCacheResults, setLambdaCacheResults] = useState<boolean>(true);
  const [lambdaValidationRegex, setLambdaValidationRegex] = useState<string>("^Bearer [-0-9a-zA-Z._~]+$");
  const [lambdaFnName, setLambdaFnName] = useState<string>("authorizer-lambda");
  const [cognitoPoolId, setCognitoPoolId] = useState<string>("us-east-1_Xk9fQ2mP");
  const [cognitoClientId, setCognitoClientId] = useState<string>("7q3mz9l4k2b1c8d0");
  const [cognitoTokenSource, setCognitoTokenSource] = useState<string>("Authorization");
  const [cognitoScopes, setCognitoScopes] = useState<string>("pets/read, pets/write");
  const [cognitoRequireScopes, setCognitoRequireScopes] = useState<boolean>(true);

  // ---------- Module 4: Throttling & Caching State ----------
  const [rate, setRate] = useState<number>(10000);
  const [burst, setBurst] = useState<number>(5000);
  const [cacheEnabled, setCacheEnabled] = useState<boolean>(true);
  const [cacheTtl, setCacheTtl] = useState<number>(300);
  const [cacheCapacity, setCacheCapacity] = useState<string>("1.6");
  const [cacheEncryption, setCacheEncryption] = useState<boolean>(true);
  const [cacheKeyParams, setCacheKeyParams] = useState<string>("version,lang");
  const [monthlyRequests, setMonthlyRequests] = useState<number>(10_000_000);

  // ---------- Module 1: Use-Case Recommender State ----------
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase>(USE_CASES[0]);

  // ---------- Module 5: OpenAPI Export State ----------
  const [specFormat, setSpecFormat] = useState<"json" | "yaml">("yaml");
  const [copied, setCopied] = useState<boolean>(false);

  // ==========================================
  // DERIVED DATA
  // ==========================================

  const protectedCount = routes.filter((r) => r.authorizer !== "NONE").length;
  const cachedCount = routes.filter((r) => r.cacheEnabled).length;
  const validatedCount = routes.filter((r) => r.validate).length;
  const coveragePct = routes.length ? Math.round((protectedCount / routes.length) * 100) : 0;

  const securityScore = routes.length
    ? Math.min(
        100,
        Math.round((protectedCount / routes.length) * 40) +
          Math.round((validatedCount / routes.length) * 20) +
          (cacheEnabled ? 10 : 0) +
          (cacheEncryption ? 10 : 0) +
          (rate <= 10000 ? 10 : 5) +
          (protectedCount === routes.length ? 10 : 0)
      )
    : 0;

  const scoreLabel = securityScore >= 80 ? "Strong" : securityScore >= 60 ? "Good" : securityScore >= 40 ? "Fair" : "Weak";

  const dailyCapacity = rate * 86400;
  const restMonthly = (monthlyRequests / 1_000_000) * 3.5;
  const httpMonthly = (monthlyRequests / 1_000_000) * 1.0;
  const cacheMonthly = cacheEnabled ? parseFloat(cacheCapacity) * 0.06 * 730 : 0;
  const cacheFillsPerDay = Math.floor(86400 / Math.max(cacheTtl, 1));

  // ==========================================
  // ROUTE BUILDER ACTIONS
  // ==========================================

  const addRoute = () => {
    let p = pathInput.trim();
    if (!p.startsWith("/")) p = "/" + p;
    if (!/^[\/a-zA-Z0-9{}_-]+$/.test(p)) {
      setPathError("Path may only contain letters, digits, / - _ and {pathParams}.");
      return;
    }
    setPathError(null);
    setRoutes((prev) => [
      ...prev,
      { id: nextId, path: p, method: methodInput, integration: integrationInput, authorizer: authorizerInput, cacheEnabled: cacheInput, validate: validateInput },
    ]);
    setNextId((n) => n + 1);
  };

  const removeRoute = (id: number) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  // ==========================================
  // OPENAPI SPEC GENERATOR
  // ==========================================

  const buildOpenApiSpec = (): Record<string, unknown> => {
    const paths: Record<string, Record<string, unknown>> = {};
    const securitySchemes: Record<string, unknown> = {};
    const usedAuths = new Set(routes.map((r) => r.authorizer));

    (Object.keys(AUTH_SCHEME_KEYS) as Array<keyof typeof AUTH_SCHEME_KEYS>).forEach((auth) => {
      if (!usedAuths.has(auth)) return;
      securitySchemes[AUTH_SCHEME_KEYS[auth]] = {
        type: "apiKey",
        name: "Authorization",
        in: "header",
        "x-amazon-apigateway-authtype":
          auth === "IAM" ? "awsSigv4" : auth === "LAMBDA" ? "custom" : "cognito_user_pools",
      };
    });

    routes.forEach((r) => {
      const pathKey = r.path.startsWith("/") ? r.path : `/${r.path}`;
      if (!paths[pathKey]) paths[pathKey] = {};

      const integration: Record<string, unknown> = {
        type:
          r.integration === "lambda" ? "aws_proxy" : r.integration === "http" ? "http_proxy" : r.integration === "dynamodb" ? "aws" : "mock",
        httpMethod: r.method,
        timeoutInMillis: 29000,
      };
      if (r.integration !== "lambda") integration.passthroughBehavior = "WHEN_NO_MATCH";
      if (r.integration === "lambda") {
        integration.uri = `arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:fn${r.path.replace(/[^a-zA-Z0-9]/g, "")}Handler/invocations`;
      } else if (r.integration === "http") {
        integration.uri = "https://example-backend.execute-api.us-east-1.amazonaws.com";
      } else if (r.integration === "dynamodb") {
        integration.uri = "arn:aws:apigateway:us-east-1:dynamodb:action/PutItem";
      } else {
        integration.requestTemplates = { "application/json": '{"statusCode": 200}' };
      }
      if (r.cacheEnabled) {
        integration.cacheKeyParameters = ["method.request.querystring.version"];
      }

      const pathSlug = r.path.replace(/[^a-zA-Z0-9]/g, "");
      const methodEntry: Record<string, unknown> = {
        summary: `${r.method} ${r.path}`,
        operationId: `${r.method.toLowerCase()}${pathSlug.charAt(0).toUpperCase() + pathSlug.slice(1)}`,
        responses: {
          "200": { description: `Successful ${r.method} response` },
          "400": { description: "Invalid request parameters or body" },
          "500": { description: "Internal server error" },
        },
        "x-amazon-apigateway-integration": integration,
      };
      if (r.authorizer !== "NONE") {
        methodEntry.security = [{ [AUTH_SCHEME_KEYS[r.authorizer]]: [] }];
      }
      if (r.validate) {
        methodEntry["x-amazon-apigateway-request-validator"] = "full";
      }

      paths[pathKey][r.method.toLowerCase()] = methodEntry;
    });

    const spec: Record<string, unknown> = {
      openapi: "3.0.1",
      info: {
        title: `${apiName} Microservices API`,
        version: "1.0.0",
        description: `Designed with SubnetLab API Designer. ${protectedCount}/${routes.length} routes protected · throttling ${formatNum(rate)} rps / burst ${formatNum(burst)} · cache TTL ${cacheTtl}s${
          cacheEnabled ? " (encrypted)" : ""
        }.`,
      },
      servers: [{ url: `https://${apiId}.execute-api.us-east-1.amazonaws.com/prod` }],
      paths,
    };
    if (Object.keys(securitySchemes).length > 0) {
      spec.components = { securitySchemes };
    }
    if (validatedCount > 0) {
      spec["x-amazon-apigateway-request-validators"] = {
        full: { validateRequestBody: true, validateRequestParameters: true },
      };
    }
    spec["x-apigateway-throttling"] = { rateLimit: rate, burstLimit: burst };
    spec["x-apigateway-cache"] = cacheEnabled
      ? { enabled: true, ttlSeconds: cacheTtl, capacityGb: parseFloat(cacheCapacity), encrypted: cacheEncryption }
      : { enabled: false };

    return spec;
  };

  const specObject = buildOpenApiSpec();
  const specText = specFormat === "json" ? JSON.stringify(specObject, null, 2) : yamlify(specObject, 0);

  const copySpec = async () => {
    try {
      await navigator.clipboard.writeText(specText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable (e.g. non-secure context) — silently ignore
    }
  };

  const downloadSpec = () => {
    const blob = new Blob([specText], { type: specFormat === "json" ? "application/json" : "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${apiName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-openapi.${specFormat === "json" ? "json" : "yaml"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-16 py-6">
      {/* ================================================================ */}
      {/* TRACK TITLE BANNER */}
      {/* ================================================================ */}
      <div className="rounded-2xl bg-gradient-to-r from-[#2e1065] via-[#4c1d95] to-[#2e1065] border border-violet-500/40 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -top-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-400/10 border border-violet-400/40 text-xs font-mono text-violet-200 mb-3">
              <span className="w-2 h-2 rounded-full bg-violet-300 animate-pulse" />
              AWS API Gateway &amp; Microservices Patterns Track
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              API Gateway <span className="text-violet-300">&amp;</span> Microservices Patterns
            </h1>
            <p className="text-violet-200/80 text-sm sm:text-base mt-2 max-w-3xl">
              Design production-grade serverless APIs: choose between REST and HTTP APIs, build routes with
              method-level authorizers, tune throttling and caching, and export a deploy-ready OpenAPI specification.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="bg-white/5 border border-violet-400/30 text-violet-100 px-3 py-1.5 rounded-lg">✓ REST vs HTTP</span>
            <span className="bg-white/5 border border-violet-400/30 text-violet-100 px-3 py-1.5 rounded-lg">✓ Route Builder</span>
            <span className="bg-white/5 border border-violet-400/30 text-violet-100 px-3 py-1.5 rounded-lg">✓ Authorizers</span>
            <span className="bg-white/5 border border-violet-400/30 text-violet-100 px-3 py-1.5 rounded-lg">✓ Throttle &amp; Cache</span>
            <span className="bg-white/5 border border-violet-400/30 text-violet-100 px-3 py-1.5 rounded-lg">✓ OpenAPI Export</span>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MODULE 1: REST vs HTTP API (#rest-vs-http) */}
      {/* ================================================================ */}
      <section
        id="rest-vs-http"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl hover:border-violet-400/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-violet-600 uppercase tracking-wider mb-1">Module 01 / API Styles</div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>⚖️</span> REST API vs HTTP API — Choosing Your Gateway
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Amazon API Gateway · 2 Flavors
          </span>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          Both API types sit in front of your backend and share the same Lambda/HTTP/private integrations — but{" "}
          <strong className="text-slate-900">REST APIs</strong> carry the full feature set (usage plans, caching, models, canary
          deployments) while <strong className="text-violet-600">HTTP APIs</strong> trade those features for lower cost and lower
          latency. The right choice depends on which capabilities your API actually needs.
        </p>

        {/* Comparison Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse table-custom">
            <thead>
              <tr className="bg-violet-50 text-xs font-mono text-violet-700 border-b border-violet-200">
                <th className="p-3">Capability</th>
                <th className="p-3">REST API</th>
                <th className="p-3">HTTP API</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-mono text-slate-900">
              {[
                ["Pricing", "$3.50 per 1M requests", "$1.00 per 1M requests"],
                ["Latency", "Higher (payload transforms, validation)", "~10–30% lower (minimal processing)"],
                ["WebSocket support", "✅ Yes (chat, streaming)", "❌ No"],
                ["Usage plans & API keys", "✅ Yes", "❌ No"],
                ["Per-route throttling & quotas", "✅ Yes", "❌ Account-level throttling only"],
                ["Stage-level caching", "✅ Yes (0.5–237 GB)", "❌ No native cache (use CloudFront)"],
                ["Request validation (models)", "✅ Yes (JSON schemas)", "⚠️ Basic only"],
                ["Authorizers", "IAM, Lambda, Cognito, JWT", "IAM, Lambda, JWT / OIDC"],
                ["Canary releases / traffic shifting", "✅ Yes", "❌ No"],
                ["Custom domains", "✅ Yes", "✅ Yes (free ACM certs)"],
                ["WAF integration", "✅ Yes", "✅ Yes"],
                ["Private endpoints (VPC)", "✅ Yes", "✅ Yes (VPC Link)"],
                ["Endpoint types", "Edge-optimized · Regional · Private", "Regional only"],
                ["OpenAPI import / export", "✅ Full (swagger + OpenAPI 3)", "✅ OpenAPI 3 subset"],
                ["Service integrations (SQS, Kinesis, Step Functions)", "✅ Yes", "✅ Yes"],
              ].map(([cap, rest, http]) => (
                <tr key={cap} className="hover:bg-violet-50/40 transition-colors">
                  <td className="p-3 font-bold text-slate-700">{cap}</td>
                  <td className="p-3">{rest}</td>
                  <td className="p-3">{http}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Use-Case Recommender */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
              <span>🎯</span> Use-Case Recommender
            </h3>
            <p className="text-xs text-slate-500">
              Pick a workload — the recommender highlights which API flavor fits and why.
            </p>
            <div className="flex flex-wrap gap-2">
              {USE_CASES.map((uc) => (
                <button
                  key={uc.label}
                  onClick={() => setSelectedUseCase(uc)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono font-semibold border transition-all text-left ${
                    selectedUseCase.label === uc.label
                      ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/30"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:border-violet-400"
                  }`}
                >
                  {uc.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-violet-50/60 border border-violet-200 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold border ${
                  selectedUseCase.rec === "HTTP API"
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-violet-600 text-white border-violet-600"
                }`}
              >
                → {selectedUseCase.rec}
              </span>
              <span className="text-xs text-slate-500 font-mono">{selectedUseCase.label}</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{selectedUseCase.reason}</p>
          </div>
        </div>

        {/* Cost Snapshot */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
            <span>💰</span> Cost Snapshot (monthly)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Monthly Requests</label>
              <input
                type="number"
                min={0}
                step={1000000}
                value={monthlyRequests}
                onChange={(e) => setMonthlyRequests(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-[11px] font-mono text-slate-500 uppercase">REST API</div>
              <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">${restMonthly.toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
              <div className="text-[11px] font-mono text-violet-600 uppercase">HTTP API</div>
              <div className="text-xl font-extrabold text-violet-700 font-mono mt-1">${httpMonthly.toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="text-[11px] font-mono text-emerald-600 uppercase">You Save</div>
              <div className="text-xl font-extrabold text-emerald-600 font-mono mt-1">
                ${(restMonthly - httpMonthly).toFixed(2)}
                <span className="text-xs font-mono text-emerald-500"> / mo</span>
              </div>
              <div className="text-[11px] font-mono text-emerald-500 mt-0.5">
                ${((restMonthly - httpMonthly) * 12).toFixed(2)} / yr
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Request pricing is region-dependent (us-east-1 reference) · Cache adds ${cacheMonthly.toFixed(2)}/mo when enabled
            ({cacheCapacity} GB × ~$0.06/GB/hr × 730h).
          </p>
        </div>
      </section>

      {/* ================================================================ */}
      {/* MODULE 2: ROUTE BUILDER (#route-builder) */}
      {/* ================================================================ */}
      <section
        id="route-builder"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl hover:border-violet-400/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-violet-600 uppercase tracking-wider mb-1">Module 02 / Route Designer</div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>🛣️</span> Interactive Route Builder
            </h2>
          </div>
          <span className="text-xs font-mono text-violet-700 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-200">
            {apiId}.execute-api.us-east-1.amazonaws.com
          </span>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          Compose your API surface route by route. Each route pairs an <strong className="text-slate-900">HTTP method</strong> and{" "}
          <strong className="text-slate-900">path</strong> (with <code className="text-violet-600 font-mono text-xs">{"{pathParams}"}</code>)
          with an integration target, an <strong className="text-slate-900">authorizer</strong>, and optional caching and request
          validation. The generated OpenAPI spec in Module 05 mirrors exactly what you build here.
        </p>

        {/* Route Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 bg-violet-50/50 p-5 rounded-xl border border-violet-200">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Resource Path</label>
            <input
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="/pets/{petId}"
              className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none ${
                pathError ? "border-rose-400 focus:border-rose-500" : "border-slate-200 focus:border-violet-500"
              }`}
            />
            {pathError && <p className="text-[11px] font-mono text-rose-500">{pathError}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase font-mono">HTTP Method</label>
            <div className="flex gap-1.5">
              {(["GET", "POST", "PUT", "DELETE"] as HttpMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethodInput(m)}
                  className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold border transition-all ${
                    methodInput === m
                      ? `${METHOD_STYLES[m]} ring-2 ring-offset-1 ${METHOD_RING[m]}`
                      : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Integration</label>
            <select
              value={integrationInput}
              onChange={(e) => setIntegrationInput(e.target.value as IntegrationType)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
            >
              {(Object.keys(INTEGRATION_LABELS) as IntegrationType[]).map((k) => (
                <option key={k} value={k}>
                  {INTEGRATION_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Authorizer</label>
            <select
              value={authorizerInput}
              onChange={(e) => setAuthorizerInput(e.target.value as AuthorizerType)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
            >
              {(Object.keys(AUTHORIZER_LABELS) as AuthorizerType[]).map((k) => (
                <option key={k} value={k}>
                  {AUTHORIZER_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Flags</label>
            <div className="flex flex-col gap-1 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <label className="flex items-center gap-2 text-xs font-mono text-slate-600 cursor-pointer">
                <input type="checkbox" checked={cacheInput} onChange={(e) => setCacheInput(e.target.checked)} className="accent-violet-600" />
                Cache
              </label>
              <label className="flex items-center gap-2 text-xs font-mono text-slate-600 cursor-pointer">
                <input type="checkbox" checked={validateInput} onChange={(e) => setValidateInput(e.target.checked)} className="accent-violet-600" />
                Validate
              </label>
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={addRoute}
              className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-mono font-bold shadow-lg shadow-violet-600/30 transition-all"
            >
              + Add Route
            </button>
          </div>
        </div>

        {/* Route Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
            <span>🗂️</span> Deployed Routes ({routes.length}) —{" "}
            <span className="text-emerald-600">{protectedCount} protected</span> ·{" "}
            <span className="text-sky-600">{cachedCount} cached</span> ·{" "}
            <span className="text-violet-600">{validatedCount} validated</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse table-custom">
              <thead>
                <tr className="bg-slate-50 text-xs font-mono text-slate-500 border-b border-slate-200">
                  <th className="p-3">Method</th>
                  <th className="p-3">Path</th>
                  <th className="p-3">Integration</th>
                  <th className="p-3">Authorizer</th>
                  <th className="p-3">Flags</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-mono text-slate-900">
                {routes.map((r) => (
                  <tr key={r.id} className="hover:bg-violet-50/40 transition-colors">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold border ${METHOD_STYLES[r.method]}`}>{r.method}</span>
                    </td>
                    <td className="p-3 text-indigo-600 font-bold">{r.path}</td>
                    <td className="p-3 text-slate-500">{INTEGRATION_LABELS[r.integration]}</td>
                    <td className="p-3">
                      {r.authorizer === "NONE" ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">None (open)</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                          {AUTHORIZER_LABELS[r.authorizer]}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="flex gap-1.5">
                        {r.cacheEnabled && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-200 text-[10px]">CACHE</span>
                        )}
                        {r.validate && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200 text-[10px]">VALIDATE</span>
                        )}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => removeRoute(r.id)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-colors"
                        aria-label={`Remove ${r.method} ${r.path}`}
                      >
                        ✕ Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {routes.length === 0 && (
            <p className="text-xs font-mono text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No routes yet — add one above so the OpenAPI spec has something to export.
            </p>
          )}
        </div>

        {/* Invocation URL preview */}
        <div className="rounded-xl bg-slate-900 p-4 font-mono text-xs space-y-1.5">
          <div className="text-violet-400 uppercase tracking-wider text-[10px]">Sample Invocation URLs</div>
          {routes.slice(0, 3).map((r) => (
            <div key={r.id} className="text-slate-300">
              <span className="text-emerald-400 font-bold">{r.method}</span>{" "}
              <span className="text-sky-300">https://{apiId}.execute-api.us-east-1.amazonaws.com/prod{r.path}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================ */}
      {/* MODULE 3: AUTHORIZER CONFIGURATION (#authorizers) */}
      {/* ================================================================ */}
      <section
        id="authorizers"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl hover:border-violet-400/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-violet-600 uppercase tracking-wider mb-1">Module 03 / Authorization</div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>🔐</span> Authorizer Configuration
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            IAM · Lambda · Cognito
          </span>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          An <strong className="text-slate-900">authorizer</strong> runs before a route's integration and decides whether a
          caller may invoke it. API Gateway supports <strong className="text-violet-600">IAM (SigV4)</strong> for machine-to-machine
          access, <strong className="text-violet-600">Lambda token authorizers</strong> for custom logic (OAuth2 introspection, API keys,
          custom headers), and <strong className="text-violet-600">Cognito User Pools</strong> for JWT-based user authentication.
        </p>

        {/* Authorizer Selector */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(["NONE", "IAM", "LAMBDA", "COGNITO"] as AuthorizerType[]).map((t) => (
            <button
              key={t}
              onClick={() => setAuthType(t)}
              className={`rounded-xl border p-4 text-left transition-all ${
                authType === t
                  ? "bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-600/30"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:border-violet-400"
              }`}
            >
              <div className="text-sm font-mono font-extrabold">{t === "NONE" ? "NONE" : t}</div>
              <div className={`text-[11px] font-mono mt-1 ${authType === t ? "text-violet-200" : "text-slate-400"}`}>
                {t === "NONE" && "Open endpoint"}
                {t === "IAM" && "SigV4 signatures"}
                {t === "LAMBDA" && "Custom token logic"}
                {t === "COGNITO" && "JWT from User Pool"}
              </div>
            </button>
          ))}
        </div>

        {/* Config Panels */}
        {authType === "IAM" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 font-mono">How IAM Authorization Works</h3>
              <ol className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li><strong className="text-violet-700">1.</strong> Client signs the request with AWS Signature Version 4 (access key + secret).</li>
                <li><strong className="text-violet-700">2.</strong> API Gateway verifies the signature and resolves the caller's IAM identity.</li>
                <li><strong className="text-violet-700">3.</strong> An <code className="font-mono text-violet-600">execute-api:Invoke</code> permission on the route resource is required — otherwise the caller gets HTTP 403.</li>
                <li><strong className="text-violet-700">4.</strong> Optional resource policies restrict access at the API level (VPC, IP, account, org).</li>
              </ol>
              <div className="rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-violet-400 text-[10px] uppercase tracking-wider">Required IAM Permission</div>
                <div>{"{"}</div>
                <div className="pl-3">"Effect": "Allow",</div>
                <div className="pl-3">"Action": "execute-api:Invoke",</div>
                <div className="pl-3">"Resource": "arn:aws:execute-api:us-east-1:123456789012:{apiId}/*/GET/pets"</div>
                <div>{"}"}</div>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Ideal for internal services, service-to-service calls, and AWS SDK clients (SDK signs automatically).
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 font-mono mb-3">Signature Verification Flow</h3>
              <div className="space-y-2">
                {["Client computes SigV4 signature over canonical request", "API Gateway recomputes signature server-side", "Identity resolved (IAM user / role / principal)", "execute-api:Invoke policy check", "Allow (200) or Deny (403)"].map((step, i) => (
                  <div key={step} className="flex items-center gap-3 text-xs font-mono">
                    <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-slate-600">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {authType === "LAMBDA" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 font-mono">Lambda Token Authorizer Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Token Source Header</label>
                  <select
                    value={lambdaTokenSource}
                    onChange={(e) => setLambdaTokenSource(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
                  >
                    <option value="Authorization">Authorization</option>
                    <option value="x-api-key">x-api-key</option>
                    <option value="x-auth-token">x-auth-token</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Result TTL (seconds)</label>
                  <input
                    type="number"
                    min={1}
                    max={3600}
                    value={lambdaTtl}
                    onChange={(e) => setLambdaTtl(Math.min(3600, Math.max(1, Number(e.target.value))))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Identity Validation Regex</label>
                  <input
                    value={lambdaValidationRegex}
                    onChange={(e) => setLambdaValidationRegex(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Authorizer Function</label>
                  <input
                    value={lambdaFnName}
                    onChange={(e) => setLambdaFnName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-mono text-slate-600 cursor-pointer pt-6">
                  <input
                    type="checkbox"
                    checked={lambdaCacheResults}
                    onChange={(e) => setLambdaCacheResults(e.target.checked)}
                    className="accent-violet-600"
                  />
                  Cache authorizer result (within TTL)
                </label>
              </div>
              <div className="rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-violet-400 text-[10px] uppercase tracking-wider">Authorizer ARN</div>
                <div>arn:aws:lambda:us-east-1:123456789012:function:{lambdaFnName}</div>
                <div className="text-slate-500 pt-1">
                  Returns IAM policy + optional {"{ \"context\": ... }"} merged into the request.
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 font-mono mb-3">Caching Note</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {lambdaCacheResults ? (
                  <>
                    Authorizer results are cached for <strong className="text-violet-700">{lambdaTtl}s</strong>. Within the TTL,
                    identical tokens skip the Lambda invocation entirely — cutting latency and Lambda cost, but changes to
                    permissions can take up to {lambdaTtl}s to propagate.
                  </>
                ) : (
                  "Caching disabled: every request invokes the authorizer Lambda, guaranteeing up-to-date decisions at the cost of extra latency and Lambda invocations."
                )}
              </p>
              <div className="rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-300">
                <div className="text-violet-400 text-[10px] uppercase tracking-wider">Example Token</div>
                <div className="truncate">Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImFiYyJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature</div>
              </div>
            </div>
          </div>
        )}

        {authType === "COGNITO" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 font-mono">Cognito User Pools Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase font-mono">User Pool ID</label>
                  <input
                    value={cognitoPoolId}
                    onChange={(e) => setCognitoPoolId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase font-mono">App Client ID</label>
                  <input
                    value={cognitoClientId}
                    onChange={(e) => setCognitoClientId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Token Source</label>
                  <select
                    value={cognitoTokenSource}
                    onChange={(e) => setCognitoTokenSource(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
                  >
                    <option value="Authorization">Authorization</option>
                    <option value="x-api-key">x-api-key</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs font-mono text-slate-600 cursor-pointer pt-6">
                  <input
                    type="checkbox"
                    checked={cognitoRequireScopes}
                    onChange={(e) => setCognitoRequireScopes(e.target.checked)}
                    className="accent-violet-600"
                  />
                  Require scopes
                </label>
                {cognitoRequireScopes && (
                  <div className="space-y-2 col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Required Scopes</label>
                    <input
                      value={cognitoScopes}
                      onChange={(e) => setCognitoScopes(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-violet-400 text-[10px] uppercase tracking-wider">JWT Verification</div>
                <div>Issuer: https://cognito-idp.us-east-1.amazonaws.com/{cognitoPoolId}</div>
                <div>Audience: {cognitoClientId}</div>
                <div className="text-slate-500">API Gateway validates signature, expiry &amp; audience automatically.</div>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 font-mono mb-3">Token Types</h3>
              <div className="space-y-3">
                <div className="rounded-lg bg-white border border-slate-200 p-3 text-xs font-mono">
                  <div className="text-sky-600 font-bold mb-1">Access Token</div>
                  <div className="text-slate-500">Used by default · contains scopes · ~1h expiry</div>
                  <div className="text-slate-500">
                    {cognitoRequireScopes ? `Scopes checked: ${cognitoScopes.split(",").map((s) => s.trim()).filter(Boolean).join(", ") || "(none)"}` : "No scope enforcement"}
                  </div>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-3 text-xs font-mono">
                  <div className="text-amber-600 font-bold mb-1">ID Token</div>
                  <div className="text-slate-500">Identity claims (sub, email, name) · useful for user-specific routes</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {authType === "NONE" && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 text-xs font-mono text-amber-700 leading-relaxed">
            ⚠️ <strong>No authorizer</strong> — the endpoint is publicly callable by anyone who can reach the API. Fine for
            public reference data, but any route exposing sensitive operations should attach IAM, Lambda, or Cognito
            authorization.
          </div>
        )}

        {/* Request Flow Diagram */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 font-mono">Request Flow</h3>
          <div className="flex flex-col md:flex-row items-stretch gap-2">
            <div className="flex-1 rounded-xl bg-white border border-slate-200 p-3 text-center">
              <div className="text-xs font-mono font-bold text-slate-900">Client</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                {authType === "IAM" && "SigV4-signed request"}
                {authType === "LAMBDA" && `${lambdaTokenSource} header + token`}
                {authType === "COGNITO" && "JWT access token"}
                {authType === "NONE" && "Plain HTTP request"}
              </div>
            </div>
            <div className="flex items-center justify-center text-violet-400 font-mono text-lg">→</div>
            <div className="flex-1 rounded-xl bg-violet-600 text-white p-3 text-center shadow-lg shadow-violet-600/30">
              <div className="text-xs font-mono font-bold">API Gateway</div>
              <div className="text-[11px] font-mono text-violet-200 mt-1">
                {authType === "IAM" && "Verify SigV4 → IAM policy check"}
                {authType === "LAMBDA" && `Invoke authorizer Lambda (cached ${lambdaTtl}s)`}
                {authType === "COGNITO" && "Verify JWT signature, expiry & audience"}
                {authType === "NONE" && "No auth — pass straight through"}
              </div>
            </div>
            <div className="flex items-center justify-center text-violet-400 font-mono text-lg">→</div>
            <div className="flex-1 rounded-xl bg-white border border-slate-200 p-3 text-center">
              <div className="text-xs font-mono font-bold text-slate-900">Backend Integration</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">Lambda / HTTP / DynamoDB</div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* MODULE 4: THROTTLING & CACHING (#throttling-caching) */}
      {/* ================================================================ */}
      <section
        id="throttling-caching"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl hover:border-violet-400/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-violet-600 uppercase tracking-wider mb-1">Module 04 / Traffic &amp; Caching</div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>🚦</span> Throttling, Caching &amp; Validation
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Rate Limits · Stage Cache · Validators
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Throttling */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
              <span>⏱️</span> Throttling (Account + Route Level)
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Steady-State Rate</label>
                <span className="text-sm font-mono font-extrabold text-violet-700">{formatNum(rate)} req/s</span>
              </div>
              <input
                type="range"
                min={100}
                max={20000}
                step={100}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
              {rate > 10000 && (
                <p className="text-[11px] font-mono text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  ⚠️ Above the default 10,000 req/s account quota — requires a quota increase via AWS Support.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Burst Capacity</label>
                <span className="text-sm font-mono font-extrabold text-violet-700">{formatNum(burst)} req</span>
              </div>
              <input
                type="range"
                min={100}
                max={50000}
                step={100}
                value={burst}
                onChange={(e) => setBurst(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white border border-slate-200 p-3">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Daily Capacity</div>
                <div className="text-lg font-extrabold font-mono text-slate-900 mt-1">{formatNum(dailyCapacity)}</div>
                <div className="text-[10px] font-mono text-slate-400">requests / day at steady state</div>
              </div>
              <div className="rounded-lg bg-white border border-slate-200 p-3">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Excess Requests</div>
                <div className={`text-lg font-extrabold font-mono mt-1 ${rate < 10000 ? "text-rose-500" : "text-emerald-600"}`}>
                  HTTP 429
                </div>
                <div className="text-[10px] font-mono text-slate-400">TooManyRequestsException</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
              REST APIs also support per-route usage-plan throttling; HTTP APIs are limited to account-level throttling. Burst
              capacity is a token bucket: short spikes up to {formatNum(burst)} requests are absorbed before 429s.
            </p>
          </div>

          {/* Caching */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
              <span>⚡</span> Stage-Level Cache (REST APIs)
            </h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-semibold text-slate-500 uppercase font-mono">Enable Cache</span>
              <input
                type="checkbox"
                checked={cacheEnabled}
                onChange={(e) => setCacheEnabled(e.target.checked)}
                className="accent-violet-600 w-5 h-5"
              />
            </label>
            {cacheEnabled ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Cache TTL</label>
                    <span className="text-sm font-mono font-extrabold text-violet-700">{cacheTtl}s</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={3600}
                    step={30}
                    value={cacheTtl}
                    onChange={(e) => setCacheTtl(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase font-mono">Cache Capacity</label>
                  <select
                    value={cacheCapacity}
                    onChange={(e) => setCacheCapacity(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
                  >
                    {CACHE_CAPACITY_TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t} GB (${(parseFloat(t) * 0.06 * 730).toFixed(0)}/mo approx)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase font-mono">
                    Cache Key Parameters (comma-separated query strings)
                  </label>
                  <input
                    value={cacheKeyParams}
                    onChange={(e) => setCacheKeyParams(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-mono text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cacheEncryption}
                    onChange={(e) => setCacheEncryption(e.target.checked)}
                    className="accent-violet-600"
                  />
                  Encrypt cache data (KMS)
                </label>
                <div className="rounded-lg bg-white border border-slate-200 p-3 text-[11px] font-mono text-slate-500">
                  Max refresh cycles/day: <strong className="text-violet-700">{formatNum(cacheFillsPerDay)}</strong> · cached
                  responses skip Lambda → lower cost &amp; latency. HTTP APIs have no native cache — front them with CloudFront.
                </div>
              </>
            ) : (
              <p className="text-xs font-mono text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Caching disabled — every request hits the backend integration. Enable it to cut origin traffic and p95 latency.
              </p>
            )}
          </div>
        </div>

        {/* Request Validation */}
        <div className="rounded-xl bg-violet-50/60 border border-violet-200 p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
            <span>🧾</span> Request Validation
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            REST API <strong className="text-violet-700">request validators</strong> reject malformed requests before they reach
            your backend — a cheap first line of defense. Two modes:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-white border border-slate-200 p-3 text-xs font-mono">
              <div className="font-bold text-slate-900 mb-1">validateRequestParameters</div>
              <div className="text-slate-500">Checks required query strings, headers, and path parameters per the API model.</div>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-3 text-xs font-mono">
              <div className="font-bold text-slate-900 mb-1">validateRequestBody</div>
              <div className="text-slate-500">Validates the JSON body against a model schema (types, required fields, enums).</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            Routes marked <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200 text-[10px]">VALIDATE</span> in
            Module 02 are exported with a <code className="text-violet-600">"full"</code> validator — {validatedCount}/{routes.length} currently.
          </p>
        </div>
      </section>

      {/* ================================================================ */}
      {/* MODULE 5: OPENAPI SPEC GENERATOR (#openapi) */}
      {/* ================================================================ */}
      <section
        id="openapi"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl hover:border-violet-400/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-violet-600 uppercase tracking-wider mb-1">Module 05 / Export</div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>📜</span> OpenAPI Spec Generator
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            OpenAPI 3.0.1 · APIGW Extensions
          </span>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          The spec below is generated live from your <strong className="text-slate-900">routes</strong>,{" "}
          <strong className="text-slate-900">authorizers</strong>, and <strong className="text-slate-900">throttling/cache settings</strong>.
          It can be imported directly into API Gateway (REST or HTTP API) or shared with clients via{" "}
          <code className="text-violet-600 font-mono text-xs">aws apigateway import-rest-api</code>.
        </p>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase font-mono">API Name</label>
            <input
              value={apiName}
              onChange={(e) => setApiName(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden font-mono text-xs">
            {(["yaml", "json"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setSpecFormat(f)}
                className={`px-4 py-2.5 font-bold uppercase transition-colors ${
                  specFormat === f ? "bg-violet-600 text-white" : "bg-white text-slate-500 hover:bg-violet-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={copySpec}
            className={`px-4 py-2.5 rounded-lg text-xs font-mono font-bold border transition-all ${
              copied
                ? "bg-emerald-500 text-white border-emerald-500"
                : "bg-violet-600 text-white border-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-600/30"
            }`}
          >
            {copied ? "✓ Copied!" : "⧉ Copy Spec"}
          </button>
          <button
            onClick={downloadSpec}
            className="px-4 py-2.5 rounded-lg text-xs font-mono font-bold bg-white text-violet-700 border border-violet-300 hover:bg-violet-50 transition-colors"
          >
            ↓ Download .{specFormat}
          </button>
          <span className="text-[11px] font-mono text-slate-400">
            {specText.split("\n").length} lines · {specText.length.toLocaleString()} chars
          </span>
        </div>

        {/* Spec Preview */}
        <div className="rounded-xl bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/60 bg-slate-800/60">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-[11px] font-mono text-slate-400">
              openapi.{specFormat === "json" ? "json" : "yaml"} — {apiName || "Unnamed"} API
            </span>
          </div>
          <pre className="p-5 text-[11px] sm:text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[480px] overflow-y-auto">
            {specText}
          </pre>
        </div>

        {/* Post-deploy commands */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 font-mono text-[11px] text-slate-500 space-y-1.5">
          <div className="text-violet-600 uppercase tracking-wider text-[10px] font-bold">Deploy with AWS CLI</div>
          <div>
            <span className="text-emerald-600">$</span> aws apigatewayv2 import-api --body file://openapi.yaml --protocol-type HTTP
          </div>
          <div>
            <span className="text-emerald-600">$</span> aws apigateway create-rest-api --body file://openapi.yaml
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECURITY POSTURE SUMMARY */}
      {/* ================================================================ */}
      <section
        id="posture"
        className="scroll-mt-24 rounded-2xl bg-gradient-to-br from-violet-50 via-white to-purple-50 border border-violet-200 p-6 sm:p-8 shadow-xl"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="text-xs font-mono text-violet-600 uppercase tracking-wider">API Security Posture</div>
            <h2 className="text-xl font-extrabold text-slate-900">Live score across your whole API design</h2>
            <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
              {coveragePct}% of routes protected ({protectedCount}/{routes.length}) · {validatedCount} routes validated ·{" "}
              {cacheEnabled ? "caching on (encrypted)" : "caching off"} · throttling {formatNum(rate)} req/s
            </p>
          </div>
          <div className="w-full md:w-72 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-4xl font-extrabold font-mono text-violet-700">{securityScore}/100</span>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                  scoreLabel === "Strong"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : scoreLabel === "Good"
                      ? "bg-sky-50 text-sky-600 border-sky-200"
                      : "bg-amber-50 text-amber-600 border-amber-200"
                }`}
              >
                {scoreLabel}
              </span>
            </div>
            <div className="h-3 rounded-full bg-white border border-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  securityScore >= 80 ? "bg-emerald-500" : securityScore >= 60 ? "bg-sky-500" : securityScore >= 40 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${securityScore}%` }}
              />
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Authorizer coverage (40) · Validation (20) · Cache enabled (10) · Cache encryption (10) · Throttle sane (10) · All
              routes protected (10)
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
