"use client";

import React, { useState } from "react";
import AwsCostSection from "./AwsCostSection";
import AwsDrSection from "./AwsDrSection";
import AwsComplianceSection from "./AwsComplianceSection";
import AwsStepFunctionsSection from "./AwsStepFunctionsSection";
import AwsApiGatewaySection from "./AwsApiGatewaySection";
import AwsCloudWatchSection from "./AwsCloudWatchSection";
import AwsSecretsManagerSection from "./AwsSecretsManagerSection";
import AwsTransitGatewaySection from "./AwsTransitGatewaySection";
import AwsAutoScalingSection from "./AwsAutoScalingSection";
import AwsWellArchitectedSection from "./AwsWellArchitectedSection";

// --- Types & Data Interfaces ---
type CloudRegion = "us-east-1" | "us-west-2" | "eu-west-1";
type SubnetMask = "/24" | "/25" | "/26" | "/27";

interface SubnetAllocation {
  name: string;
  type: "public" | "private" | "database";
  az: string;
  cidr: string;
  totalIps: number;
  usableIps: number;
  gateway: string;
}

export default function AwsSection() {
  // ==========================================
  // SECTION 1: VPC & CIDR PLANNING STATE
  // ==========================================
  const [vpcCidr, setVpcCidr] = useState<string>("10.0.0.0/16");
  const [selectedAzCount, setSelectedAzCount] = useState<number>(3);
  const [subnetMask, setSubnetMask] = useState<SubnetMask>("/24");
  const [selectedIaCTab, setSelectedIaCTab] = useState<"terraform" | "cloudformation">("terraform");

  // Helper to generate subnets based on VPC CIDR and AZ count
  const getSubnetAllocations = (): SubnetAllocation[] => {
    const azs = ["us-east-1a", "us-east-1b", "us-east-1c"].slice(0, selectedAzCount);
    const allocations: SubnetAllocation[] = [];

    const totalIpsMap: Record<SubnetMask, number> = {
      "/24": 256,
      "/25": 128,
      "/26": 64,
      "/27": 32,
    };
    const totalIps = totalIpsMap[subnetMask];
    const usableIps = totalIps - 5; // 5 AWS Reserved IPs

    const basePrefix = vpcCidr.split(".")[0] + "." + vpcCidr.split(".")[1];

    let subnetCounter = 1;
    azs.forEach((az) => {
      // Public Subnet
      allocations.push({
        name: `Public Subnet ${az.slice(-2).toUpperCase()}`,
        type: "public",
        az,
        cidr: `${basePrefix}.${subnetCounter}.0${subnetMask}`,
        totalIps,
        usableIps,
        gateway: "Internet Gateway (IGW)",
      });
      subnetCounter++;

      // Private App Subnet
      allocations.push({
        name: `Private App Subnet ${az.slice(-2).toUpperCase()}`,
        type: "private",
        az,
        cidr: `${basePrefix}.${subnetCounter * 10}.0${subnetMask}`,
        totalIps,
        usableIps,
        gateway: `NAT Gateway (${az})`,
      });
      subnetCounter++;

      // Database Subnet
      allocations.push({
        name: `Isolated DB Subnet ${az.slice(-2).toUpperCase()}`,
        type: "database",
        az,
        cidr: `${basePrefix}.${subnetCounter * 20}.0${subnetMask}`,
        totalIps,
        usableIps,
        gateway: "Isolated (No Egress)",
      });
      subnetCounter++;
    });

    return allocations;
  };

  const subnets = getSubnetAllocations();

  // ==========================================
  // SECTION 2: IAM POLICY SIMULATOR STATE
  // ==========================================
  const [selectedPreset, setSelectedPreset] = useState<string>("s3-readonly");
  const [policyJson, setPolicyJson] = useState<string>(
    JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "AllowS3ReadWithTLS",
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject", "s3:ListBucket"],
            Resource: ["arn:aws:s3:::production-app-bucket", "arn:aws:s3:::production-app-bucket/*"],
            Condition: {
              Bool: {
                "aws:SecureTransport": "true",
              },
            },
          },
          {
            Sid: "DenyUnsecureTransport",
            Effect: "Deny",
            Principal: "*",
            Action: "s3:*",
            Resource: "*",
            Condition: {
              Bool: {
                "aws:SecureTransport": "false",
              },
            },
          },
        ],
      },
      null,
      2
    )
  );

  const [simAction, setSimAction] = useState<string>("s3:GetObject");
  const [simResource, setSimResource] = useState<string>("arn:aws:s3:::production-app-bucket/index.html");
  const [simMfa, setSimMfa] = useState<boolean>(true);
  const [simTls, setSimTls] = useState<boolean>(true);
  const [simClientIp, setSimClientIp] = useState<string>("203.0.113.50");
  const [evalResult, setEvalResult] = useState<{
    decision: "ALLOW" | "EXPLICIT_DENY" | "IMPLICIT_DENY";
    reason: string;
    matchedStatement?: string;
  } | null>(null);

  const handleLoadPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    let samplePolicy = {};
    if (presetKey === "s3-readonly") {
      samplePolicy = {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "AllowS3ReadWithTLS",
            Effect: "Allow",
            Action: ["s3:GetObject", "s3:ListBucket"],
            Resource: ["arn:aws:s3:::production-app-bucket", "arn:aws:s3:::production-app-bucket/*"],
            Condition: { Bool: { "aws:SecureTransport": "true" } },
          },
          {
            Sid: "DenyUnsecureTransport",
            Effect: "Deny",
            Action: "s3:*",
            Resource: "*",
            Condition: { Bool: { "aws:SecureTransport": "false" } },
          },
        ],
      };
      setSimAction("s3:GetObject");
      setSimResource("arn:aws:s3:::production-app-bucket/index.html");
    } else if (presetKey === "ec2-admin-deny-prod") {
      samplePolicy = {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "AllowEC2Full",
            Effect: "Allow",
            Action: "ec2:*",
            Resource: "*",
          },
          {
            Sid: "DenyTerminateProdInstances",
            Effect: "Deny",
            Action: "ec2:TerminateInstances",
            Resource: "arn:aws:ec2:*:*:instance/i-prod-*",
          },
        ],
      };
      setSimAction("ec2:TerminateInstances");
      setSimResource("arn:aws:ec2:us-east-1:123456789012:instance/i-prod-99887766");
    } else if (presetKey === "dynamodb-ip-restrict") {
      samplePolicy = {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "AllowDynamoDBCorporateIp",
            Effect: "Allow",
            Action: ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:PutItem"],
            Resource: "arn:aws:dynamodb:*:*:table/UsersTable",
            Condition: { IpAddress: { "aws:SourceIp": "203.0.113.0/24" } },
          },
        ],
      };
      setSimAction("dynamodb:PutItem");
      setSimResource("arn:aws:dynamodb:us-east-1:123456789012:table/UsersTable");
    }
    setPolicyJson(JSON.stringify(samplePolicy, null, 2));
    setEvalResult(null);
  };

  const runIamEvaluation = () => {
    try {
      const parsed = JSON.parse(policyJson);
      const statements = parsed.Statement || [];

      // 1. Check Explicit Deny
      for (const stmt of statements) {
        if (stmt.Effect === "Deny") {
          const actionMatch = Array.isArray(stmt.Action)
            ? stmt.Action.some((a: string) => a === "*" || a === simAction || simAction.startsWith(a.replace("*", "")))
            : stmt.Action === "*" || stmt.Action === simAction || simAction.startsWith(stmt.Action.replace("*", ""));

          if (actionMatch) {
            // Check condition for TLS
            if (stmt.Condition?.Bool?.["aws:SecureTransport"] === "false" && !simTls) {
              setEvalResult({
                decision: "EXPLICIT_DENY",
                reason: `Explicit Deny triggered by Statement '${stmt.Sid || "Unnamed"}': Request uses insecure transport (HTTPS = false).`,
                matchedStatement: stmt.Sid,
              });
              return;
            }
            if (stmt.Resource === "*" || simResource.includes("prod")) {
              setEvalResult({
                decision: "EXPLICIT_DENY",
                reason: `Explicit Deny triggered by Statement '${stmt.Sid || "Unnamed"}': Target resource is protected from this action.`,
                matchedStatement: stmt.Sid,
              });
              return;
            }
          }
        }
      }

      // 2. Check Explicit Allow
      for (const stmt of statements) {
        if (stmt.Effect === "Allow") {
          const actionMatch = Array.isArray(stmt.Action)
            ? stmt.Action.some((a: string) => a === "*" || a === simAction || simAction.startsWith(a.replace("*", "")))
            : stmt.Action === "*" || stmt.Action === simAction || simAction.startsWith(stmt.Action.replace("*", ""));

          if (actionMatch) {
            // Condition check
            if (stmt.Condition?.Bool?.["aws:SecureTransport"] === "true" && !simTls) {
              continue; // Condition failed
            }
            if (stmt.Condition?.IpAddress?.["aws:SourceIp"] && !simClientIp.startsWith("203.0.113.")) {
              continue; // IP condition failed
            }

            setEvalResult({
              decision: "ALLOW",
              reason: `Explicit Allow matched Statement '${stmt.Sid || "Unnamed"}': Action '${simAction}' granted on resource.`,
              matchedStatement: stmt.Sid,
            });
            return;
          }
        }
      }

      // 3. Implicit Deny if no Allow matched
      setEvalResult({
        decision: "IMPLICIT_DENY",
        reason: "Implicit Deny: No policy Statement explicitly allowed the requested action and resource combination.",
      });
    } catch {
      setEvalResult({
        decision: "EXPLICIT_DENY",
        reason: "Syntax Error in Policy JSON! Unable to parse policy document.",
      });
    }
  };

  // ==========================================
  // SECTION 3: S3 BUCKET SECURITY & ENCRYPTION
  // ==========================================
  const [s3Bpa, setS3Bpa] = useState<boolean>(true);
  const [s3Encryption, setS3Encryption] = useState<"SSE-S3" | "SSE-KMS" | "SSE-C" | "NONE">("SSE-KMS");
  const [s3Versioning, setS3Versioning] = useState<boolean>(true);
  const [s3TlsPolicy, setS3TlsPolicy] = useState<boolean>(true);
  const [s3ObjectLock, setS3ObjectLock] = useState<boolean>(false);

  // Security score calculation
  const calculateS3Score = () => {
    let score = 0;
    if (s3Bpa) score += 30;
    if (s3Encryption === "SSE-KMS") score += 25;
    else if (s3Encryption === "SSE-S3") score += 20;
    else if (s3Encryption === "SSE-C") score += 15;

    if (s3Versioning) score += 20;
    if (s3TlsPolicy) score += 15;
    if (s3ObjectLock) score += 10;
    return Math.min(score, 100);
  };

  const s3Score = calculateS3Score();

  // ==========================================
  // SECTION 4: EC2 vs ECS vs EKS COMPUTE MATRIX
  // ==========================================
  const [selectedWorkload, setSelectedWorkload] = useState<"monolith" | "microservices" | "k8s-ecosystem" | "serverless-containers">("microservices");
  const [activeTabCompute, setActiveTabCompute] = useState<"ec2" | "ecs" | "eks">("ecs");

  // ==========================================
  // SECTION 5: LAMBDA & CLOUDFRONT EXECUTION
  // ==========================================
  const [isColdStart, setIsColdStart] = useState<boolean>(true);
  const [isCacheHit, setIsCacheHit] = useState<boolean>(false);
  const [lambdaMemory, setLambdaMemory] = useState<number>(256);
  const [execLogs, setExecLogs] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const runLambdaSimulation = () => {
    setIsExecuting(true);
    setExecLogs([]);

    const timestamp = new Date().toISOString();
    const reqId = "c8f92a10-449e-4b21-a398-99d811ab" + Math.floor(Math.random() * 8999 + 1000);
    const logs: string[] = [];

    logs.push(`[CloudFront] Request received at Edge POP (IAD53-P1).`);

    if (isCacheHit) {
      logs.push(`[CloudFront] Cache HIT for key '/api/v1/data'. Returning HTTP 200 from Edge Cache (Latency: 4ms).`);
      logs.push(`[Execution Bypassed] Origin Lambda function was NOT invoked.`);
      setExecLogs(logs);
      setIsExecuting(false);
      return;
    }

    logs.push(`[CloudFront] Cache MISS. Forwarding request to Origin API Gateway...`);
    logs.push(`[API Gateway] HTTP GET /api/v1/data matched Route ID 'rt_99a82'. Routing to Lambda ARN.`);

    setTimeout(() => {
      if (isColdStart) {
        logs.push(`[AWS Lambda] INIT_START Runtime Version: nodejs20.x v12`);
        logs.push(`[AWS Lambda] Extension Init Duration: 42.10 ms`);
        logs.push(`[AWS Lambda] Container Init Duration: 312.85 ms (Cold Start)`);
      } else {
        logs.push(`[AWS Lambda] Container Warm Reuse: Reusing existing execution sandbox.`);
      }

      logs.push(`[AWS Lambda] START RequestId: ${reqId}`);
      logs.push(`${timestamp} INFO Processing request payload for memory=${lambdaMemory}MB...`);
      logs.push(`${timestamp} INFO Querying DynamoDB table 'AppConfig' (Latency: 6.2 ms)`);

      const duration = isColdStart ? (18.4 + Math.random() * 5).toFixed(2) : (6.1 + Math.random() * 2).toFixed(2);
      const initDuration = isColdStart ? "354.95" : "0.00";
      const billedDuration = Math.ceil(parseFloat(duration));

      logs.push(`[AWS Lambda] END RequestId: ${reqId}`);
      logs.push(
        `[CloudWatch REPORT] RequestId: ${reqId}\tDuration: ${duration} ms\tBilled Duration: ${billedDuration} ms\tMemory Size: ${lambdaMemory} MB\tMax Memory Used: 68 MB\t${
          isColdStart ? `Init Duration: ${initDuration} ms` : ""
        }`
      );

      setExecLogs(logs);
      setIsExecuting(false);
    }, 400);
  };

  return (
    <div className="space-y-16 py-6">
      {/* Track Title Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#161b22] via-[#1c2333] to-[#161b22] border border-slate-200 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-[#f0883e]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0883e]/10 border border-[#f0883e]/30 text-xs font-mono text-[#f0883e] mb-3">
              <span className="w-2 h-2 rounded-full bg-[#f0883e] animate-pulse" />
              AWS Cloud Architecture Track
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              AWS Cloud Architecture & Security Lab
            </h1>
            <p className="text-slate-500 text-sm sm:text-base mt-2 max-w-3xl">
              Deep dive into production-grade AWS Cloud Networking, IAM security policy simulation, S3 encryption compliance, EC2/ECS/EKS compute selection, and Serverless + CDN execution flows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="bg-slate-50 border border-slate-200 text-emerald-600 px-3 py-1.5 rounded-lg">
              ✓ Multi-AZ Subnets
            </span>
            <span className="bg-slate-50 border border-slate-200 text-indigo-600 px-3 py-1.5 rounded-lg">
              ✓ IAM Evaluator
            </span>
            <span className="bg-slate-50 border border-slate-200 text-violet-600 px-3 py-1.5 rounded-lg">
              ✓ S3 Shield
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODULE 1: AWS VPC SUBNETTING & CIDR BLOCK PLANNING (#vpc) */}
      {/* ========================================================================= */}
      <section
        id="vpc"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow space-y-8 shadow-xl hover:border-[#f0883e]/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-[#f0883e] uppercase tracking-wider mb-1">
              Module 01 / Cloud Infrastructure
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>☁️</span> AWS VPC Subnetting & CIDR Block Planning
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            RFC 1918 Private IPv4 Ranges
          </span>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          In Amazon Web Services, a <strong className="text-slate-900">Virtual Private Cloud (VPC)</strong> spans an entire AWS Region. Subnets are strictly bound to a single <strong className="text-slate-900">Availability Zone (AZ)</strong>. AWS automatically reserves <strong className="text-[#f0883e]">5 IP addresses per subnet</strong> for network routing, DNS, and broadcast emulation.
        </p>

        {/* VPC Configuration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
          {/* VPC CIDR Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase font-mono">
              VPC CIDR Block Range
            </label>
            <select
              value={vpcCidr}
              onChange={(e) => setVpcCidr(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-[#f0883e] focus:outline-none"
            >
              <option value="10.0.0.0/16">10.0.0.0/16 (65,536 IPs - Standard Enterprise)</option>
              <option value="172.16.0.0/16">172.16.0.0/16 (65,536 IPs - Hybrid On-Prem)</option>
              <option value="192.168.0.0/16">192.168.0.0/16 (65,536 IPs - Small VPC)</option>
            </select>
          </div>

          {/* Availability Zones Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase font-mono">
              Availability Zone Multi-AZ Redundancy
            </label>
            <div className="flex gap-2">
              {[2, 3].map((count) => (
                <button
                  key={count}
                  onClick={() => setSelectedAzCount(count)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all border ${
                    selectedAzCount === count
                      ? "bg-[#f0883e]/20 text-[#f0883e] border-[#f0883e]"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:border-[#8b949e]"
                  }`}
                >
                  {count} AZs ({count === 2 ? "High Availability" : "Max Fault Tolerant"})
                </button>
              ))}
            </div>
          </div>

          {/* Subnet Netmask Prefix */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase font-mono">
              Subnet Mask Size
            </label>
            <select
              value={subnetMask}
              onChange={(e) => setSubnetMask(e.target.value as SubnetMask)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-[#f0883e] focus:outline-none"
            >
              <option value="/24">/24 (256 Total IPs / 251 Usable)</option>
              <option value="/25">/25 (128 Total IPs / 123 Usable)</option>
              <option value="/26">/26 (64 Total IPs / 59 Usable)</option>
              <option value="/27">/27 (32 Total IPs / 27 Usable)</option>
            </select>
          </div>
        </div>

        {/* AWS 5 Reserved IPs Banner */}
        <div className="rounded-xl bg-white border border-slate-200 card-shadow p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono border-b border-slate-200 pb-2">
            <span className="text-amber-600 font-bold">⚠️ AWS 5 Reserved IPs Rule (Per Subnet)</span>
            <span className="text-slate-500">Example for Subnet 10.0.1.0/24</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs font-mono">
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-indigo-600 block font-bold">10.0.1.0</span>
              <span className="text-[11px] text-slate-500">Network Address</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-emerald-600 block font-bold">10.0.1.1</span>
              <span className="text-[11px] text-slate-500">VPC Router / Gateway</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-violet-600 block font-bold">10.0.1.2</span>
              <span className="text-[11px] text-slate-500">Amazon DNS Server</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-amber-600 block font-bold">10.0.1.3</span>
              <span className="text-[11px] text-slate-500">Reserved for Future Use</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-rose-600 block font-bold">10.0.1.255</span>
              <span className="text-[11px] text-slate-500">Network Broadcast</span>
            </div>
          </div>
        </div>

        {/* Calculated Multi-AZ Subnet Allocation Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
            <span>🗺️</span> Multi-AZ Subnet Topology ({subnets.length} Total Subnets)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse table-custom">
              <thead>
                <tr className="bg-slate-50 text-xs font-mono text-slate-500 border-b border-slate-200">
                  <th className="p-3">Subnet Name</th>
                  <th className="p-3">Type & Isolation</th>
                  <th className="p-3">Availability Zone</th>
                  <th className="p-3">CIDR Block</th>
                  <th className="p-3">Total IPs</th>
                  <th className="p-3">Usable Host IPs</th>
                  <th className="p-3">Target Egress Route</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d] text-xs font-mono text-slate-900">
                {subnets.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-bold">{sub.name}</td>
                    <td className="p-3">
                      {sub.type === "public" && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                          Public Subnet (IGW)
                        </span>
                      )}
                      {sub.type === "private" && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
                          Private App (NAT)
                        </span>
                      )}
                      {sub.type === "database" && (
                        <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-200">
                          Isolated DB (No Egress)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{sub.az}</td>
                    <td className="p-3 text-indigo-600 font-bold">{sub.cidr}</td>
                    <td className="p-3 text-slate-500">{sub.totalIps}</td>
                    <td className="p-3 text-emerald-600 font-bold">{sub.usableIps} IPs</td>
                    <td className="p-3 text-slate-500">{sub.gateway}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Infrastructure-as-Code (IaC) Code Output */}
        <div className="rounded-xl bg-white border border-slate-200 card-shadow p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-xs font-mono font-bold text-slate-900">
              Generated Infrastructure as Code (IaC)
            </h4>
            <div className="flex gap-2 font-mono text-xs">
              <button
                onClick={() => setSelectedIaCTab("terraform")}
                className={`px-3 py-1 rounded transition-colors ${
                  selectedIaCTab === "terraform"
                    ? "bg-indigo-100 text-indigo-600 border border-indigo-300 font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Terraform HCL
              </button>
              <button
                onClick={() => setSelectedIaCTab("cloudformation")}
                className={`px-3 py-1 rounded transition-colors ${
                  selectedIaCTab === "cloudformation"
                    ? "bg-[#f0883e]/20 text-[#f0883e] border border-[#f0883e]/40 font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                AWS CloudFormation
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-lg bg-white border border-slate-200 text-xs font-mono text-emerald-600 overflow-x-auto leading-relaxed">
            {selectedIaCTab === "terraform" ? (
              `# Terraform VPC & Multi-AZ Subnets
resource "aws_vpc" "main" {
  cidr_block           = "${vpcCidr}"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "enterprise-production-vpc" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

${subnets
  .slice(0, 3)
  .map(
    (s, i) => `resource "aws_subnet" "subnet_${i + 1}" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "${s.cidr}"
  availability_zone = "${s.az}"
  map_public_ip_on_launch = ${s.type === "public"}
  tags = { Name = "${s.name}" }
}`
  )
  .join("\n\n")}`
            ) : (
              `AWSTemplateFormatVersion: '2010-09-09'
Description: AWS VPC Infrastructure with Multi-AZ Subnets

Resources:
  ProductionVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: '${vpcCidr}'
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: enterprise-production-vpc

  InternetGateway:
    Type: AWS::EC2::InternetGateway

  VPCGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref ProductionVPC
      InternetGatewayId: !Ref InternetGateway`
            )}
          </pre>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SUB-MODULE 2: IAM POLICY JSON SIMULATOR & ACCESS CONTROL (#iam) */}
      {/* ========================================================================= */}
      <section
        id="iam"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow space-y-8 shadow-xl hover:border-indigo-300 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-indigo-600 uppercase tracking-wider mb-1">
              Module 02 / Identity & Governance
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>🔑</span> IAM Policy JSON Simulator & Access Control
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            AWS IAM Evaluation Logic
          </span>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          AWS IAM evaluates policies using a strict hierarchy: <strong className="text-rose-600">Explicit Deny</strong> always overrides any Allow. By default, all requests are <strong className="text-amber-600">implicitly denied</strong> unless an explicit Allow matches the principal, action, resource, and context conditions.
        </p>

        {/* Preset Selector Buttons */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-slate-500 uppercase">
            Load Sample IAM Policy Document Presets:
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "s3-readonly", label: "S3 ReadOnly + Enforced TLS" },
              { id: "ec2-admin-deny-prod", label: "EC2 Admin (Explicit Deny Prod)" },
              { id: "dynamodb-ip-restrict", label: "DynamoDB IP Range Restriction" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleLoadPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                  selectedPreset === p.id
                    ? "bg-indigo-100 text-indigo-600 border-indigo-400"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:border-[#8b949e]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Editor & Simulation Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Policy JSON Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
              <span>IAM JSON Policy Document</span>
              <span className="text-indigo-600">Version: 2012-10-17</span>
            </div>
            <textarea
              value={policyJson}
              onChange={(e) => setPolicyJson(e.target.value)}
              rows={16}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-emerald-600 focus:border-indigo-400 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Action Simulator Controls */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 font-mono border-b border-slate-200 pb-2 flex items-center gap-2">
              <span>⚡</span> Request Context Simulator
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-500 block mb-1">AWS Action (API Operation)</label>
                <input
                  type="text"
                  value={simAction}
                  onChange={(e) => setSimAction(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Target Resource ARN</label>
                <input
                  type="text"
                  value={simResource}
                  onChange={(e) => setSimResource(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-slate-500 block mb-1">HTTPS Transport (TLS)</label>
                  <button
                    onClick={() => setSimTls(!simTls)}
                    className={`w-full p-2 rounded text-xs font-bold border transition-colors ${
                      simTls
                        ? "bg-emerald-500/20 text-emerald-600 border-emerald-400"
                        : "bg-[#ff7b72]/20 text-rose-600 border-rose-400"
                    }`}
                  >
                    {simTls ? "🔒 TLS Enabled (True)" : "⚠️ HTTP Plain Text (False)"}
                  </button>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1">MFA Authenticated</label>
                  <button
                    onClick={() => setSimMfa(!simMfa)}
                    className={`w-full p-2 rounded text-xs font-bold border transition-colors ${
                      simMfa
                        ? "bg-emerald-500/20 text-emerald-600 border-emerald-400"
                        : "bg-[#ffa657]/20 text-amber-600 border-amber-400"
                    }`}
                  >
                    {simMfa ? "🔑 MFA Active" : "❌ No MFA"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Client Source IP</label>
                <input
                  type="text"
                  value={simClientIp}
                  onChange={(e) => setSimClientIp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={runIamEvaluation}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-600/90 text-slate-900 font-bold rounded-lg text-xs font-mono transition-colors shadow-lg"
            >
              Evaluate IAM Request
            </button>

            {/* Evaluation Result Banner */}
            {evalResult && (
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  evalResult.decision === "ALLOW"
                    ? "bg-emerald-50 border-emerald-400/40 text-emerald-600"
                    : evalResult.decision === "EXPLICIT_DENY"
                    ? "bg-rose-50 border-rose-400/40 text-rose-600"
                    : "bg-amber-50 border-amber-400/40 text-amber-600"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span>EVALUATION RESULT: {evalResult.decision}</span>
                  <span>{evalResult.matchedStatement ? `Statement: ${evalResult.matchedStatement}` : ""}</span>
                </div>
                <p className="text-xs text-slate-900 leading-relaxed">{evalResult.reason}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SUB-MODULE 3: S3 BUCKET SECURITY POLICIES & ENCRYPTION (#s3) */}
      {/* ========================================================================= */}
      <section
        id="s3"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow space-y-8 shadow-xl hover:border-violet-400/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-violet-600 uppercase tracking-wider mb-1">
              Module 03 / Data Protection
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>📦</span> Amazon S3 Security Controls & Default Encryption
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">Security Audit Rating:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                s3Score >= 80
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : s3Score >= 50
                  ? "bg-amber-50 text-amber-600 border-amber-200"
                  : "bg-rose-50 text-rose-600 border-rose-200"
              }`}
            >
              {s3Score} / 100 {s3Score >= 80 ? "EXCELLENT" : s3Score >= 50 ? "MODERATE RISK" : "CRITICAL RISK"}
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          Amazon S3 buckets store mission-critical data. Hardening S3 requires activating <strong className="text-slate-900">Block Public Access (BPA)</strong>, enforcing <strong className="text-slate-900">Default Server-Side Encryption (SSE-KMS)</strong>, and blocking unencrypted HTTP transport via bucket policies.
        </p>

        {/* Security Controls Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Block Public Access */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-900">Block Public Access (BPA)</span>
              <button
                onClick={() => setS3Bpa(!s3Bpa)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                  s3Bpa
                    ? "bg-emerald-500/20 text-emerald-600 border-emerald-400"
                    : "bg-[#ff7b72]/20 text-rose-600 border-rose-400"
                }`}
              >
                {s3Bpa ? "ENABLED (+30 pts)" : "DISABLED (0 pts)"}
              </button>
            </div>
            <p className="text-xs text-slate-500">Blocks public bucket ACLs and policies enterprise-wide.</p>
          </div>

          {/* Encryption Type */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-mono font-bold text-slate-900 block">Default Encryption</span>
            <select
              value={s3Encryption}
              onChange={(e) => setS3Encryption(e.target.value as "SSE-S3" | "SSE-KMS" | "SSE-C" | "NONE")}
              className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono text-slate-900 focus:border-violet-400 focus:outline-none"
            >
              <option value="SSE-KMS">SSE-KMS (AWS Key Management Service) +25 pts</option>
              <option value="SSE-S3">SSE-S3 (Amazon Managed AES-256) +20 pts</option>
              <option value="SSE-C">SSE-C (Customer Provided Keys) +15 pts</option>
              <option value="NONE">None (Unencrypted) 0 pts</option>
            </select>
            <p className="text-xs text-slate-500">Encrypts all S3 objects at rest prior to storage.</p>
          </div>

          {/* Bucket Versioning */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-900">Bucket Versioning</span>
              <button
                onClick={() => setS3Versioning(!s3Versioning)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                  s3Versioning
                    ? "bg-emerald-500/20 text-emerald-600 border-emerald-400"
                    : "bg-[#ffa657]/20 text-amber-600 border-amber-400"
                }`}
              >
                {s3Versioning ? "ENABLED (+20 pts)" : "DISABLED (0 pts)"}
              </button>
            </div>
            <p className="text-xs text-slate-500">Protects against unintended deletes and ransomware overwrites.</p>
          </div>

          {/* Enforce TLS 1.2 Policy */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-900">Enforce TLS (aws:SecureTransport)</span>
              <button
                onClick={() => setS3TlsPolicy(!s3TlsPolicy)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                  s3TlsPolicy
                    ? "bg-emerald-500/20 text-emerald-600 border-emerald-400"
                    : "bg-[#ff7b72]/20 text-rose-600 border-rose-400"
                }`}
              >
                {s3TlsPolicy ? "ENFORCED (+15 pts)" : "NOT ENFORCED (0 pts)"}
              </button>
            </div>
            <p className="text-xs text-slate-500">Denies unencrypted HTTP requests in transit.</p>
          </div>

          {/* Object Lock WORM */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-900">S3 Object Lock (WORM)</span>
              <button
                onClick={() => setS3ObjectLock(!s3ObjectLock)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                  s3ObjectLock
                    ? "bg-emerald-500/20 text-emerald-600 border-emerald-400"
                    : "bg-[#8b949e]/20 text-slate-500 border-slate-200"
                }`}
              >
                {s3ObjectLock ? "ENABLED (+10 pts)" : "DISABLED (0 pts)"}
              </button>
            </div>
            <p className="text-xs text-slate-500">Write Once Read Many compliance protection.</p>
          </div>
        </div>

        {/* Auto-Generated Enforced S3 Bucket Policy */}
        <div className="rounded-xl bg-white border border-slate-200 card-shadow p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-mono font-bold text-slate-900">
              Hardened S3 Bucket Policy (JSON)
            </h4>
            <span className="text-xs font-mono text-violet-600">Enforces TLS & SSE Encryption</span>
          </div>

          <pre className="p-4 rounded-lg bg-white border border-slate-200 text-xs font-mono text-violet-600 overflow-x-auto leading-relaxed">
            {JSON.stringify(
              {
                Version: "2012-10-17",
                Statement: [
                  ...(s3TlsPolicy
                    ? [
                        {
                          Sid: "EnforceTLSRequestsOnly",
                          Effect: "Deny",
                          Principal: "*",
                          Action: "s3:*",
                          Resource: ["arn:aws:s3:::my-secure-bucket", "arn:aws:s3:::my-secure-bucket/*"],
                          Condition: {
                            Bool: {
                              "aws:SecureTransport": "false",
                            },
                          },
                        },
                      ]
                    : []),
                  {
                    Sid: "DenyUnencryptedObjectUploads",
                    Effect: "Deny",
                    Principal: "*",
                    Action: "s3:PutObject",
                    Resource: "arn:aws:s3:::my-secure-bucket/*",
                    Condition: {
                      StringNotEquals: {
                        "s3:x-amz-server-side-encryption": s3Encryption === "SSE-KMS" ? "aws:kms" : "AES256",
                      },
                    },
                  },
                ],
              },
              null,
              2
            )}
          </pre>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SUB-MODULE 4: EC2 vs ECS vs EKS CONTAINER INFRASTRUCTURE (#compute) */}
      {/* ========================================================================= */}
      <section
        id="compute"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow space-y-8 shadow-xl hover:border-emerald-400/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-emerald-600 uppercase tracking-wider mb-1">
              Module 04 / Compute & Orchestration
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>⚡</span> EC2 vs ECS vs EKS Container Infrastructure
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            AWS Compute Selector Matrix
          </span>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          AWS offers three primary compute paradigms: <strong className="text-slate-900">Amazon EC2</strong> for raw virtual machines, <strong className="text-slate-900">Amazon ECS</strong> for AWS-native container management, and <strong className="text-slate-900">Amazon EKS</strong> for enterprise Kubernetes orchestration.
        </p>

        {/* Workload Recommender Filter */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
          <label className="text-xs font-mono font-bold text-slate-500 uppercase block">
            Select Your Target Application Workload:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: "monolith", label: "Legacy Monolith (Full OS Access)" },
              { id: "microservices", label: "Containerized Microservices" },
              { id: "k8s-ecosystem", label: "Multi-Cloud Kubernetes Standard" },
              { id: "serverless-containers", label: "Serverless Containers (Fargate)" },
            ].map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWorkload(w.id as "monolith" | "microservices" | "k8s-ecosystem" | "serverless-containers")}
                className={`p-3 rounded-lg text-xs font-mono font-bold border text-left transition-all ${
                  selectedWorkload === w.id
                    ? "bg-emerald-500/20 text-emerald-600 border-emerald-400"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:border-[#8b949e]"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Deep Dive Compute Platform Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* EC2 Card */}
          <div
            onClick={() => setActiveTabCompute("ec2")}
            className={`p-5 rounded-xl border cursor-pointer transition-all space-y-4 ${
              activeTabCompute === "ec2"
                ? "bg-slate-50 border-indigo-400 ring-1 ring-[#58a6ff]"
                : "bg-white border-slate-200 hover:border-[#8b949e]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xl">🖥️</span>
              <span className="text-xs font-mono font-bold text-indigo-600">IaaS / Virtual Machines</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Amazon EC2</h3>
              <p className="text-xs text-slate-500 mt-1">Elastic Compute Cloud</p>
            </div>
            <ul className="text-xs text-slate-500 space-y-2 font-mono">
              <li>• Full root SSH & OS kernel access</li>
              <li>• Security Groups per Instance</li>
              <li>• EBS block storage & AMI snapshots</li>
              <li>• High management overhead (OS patching)</li>
            </ul>
          </div>

          {/* ECS Card */}
          <div
            onClick={() => setActiveTabCompute("ecs")}
            className={`p-5 rounded-xl border cursor-pointer transition-all space-y-4 ${
              activeTabCompute === "ecs"
                ? "bg-slate-50 border-emerald-400 ring-1 ring-[#7ee787]"
                : "bg-white border-slate-200 hover:border-[#8b949e]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xl">🐳</span>
              <span className="text-xs font-mono font-bold text-emerald-600">AWS Native Container Engine</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Amazon ECS</h3>
              <p className="text-xs text-slate-500 mt-1">Elastic Container Service</p>
            </div>
            <ul className="text-xs text-slate-500 space-y-2 font-mono">
              <li>• Lightweight Task Definitions & Services</li>
              <li>• Deep integration with ALB & IAM Roles</li>
              <li>• Runs on Fargate serverless or EC2</li>
              <li>• Low operational complexity</li>
            </ul>
          </div>

          {/* EKS Card */}
          <div
            onClick={() => setActiveTabCompute("eks")}
            className={`p-5 rounded-xl border cursor-pointer transition-all space-y-4 ${
              activeTabCompute === "eks"
                ? "bg-slate-50 border-violet-400 ring-1 ring-[#bc8cff]"
                : "bg-white border-slate-200 hover:border-[#8b949e]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xl">☸️</span>
              <span className="text-xs font-mono font-bold text-violet-600">Managed Kubernetes</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Amazon EKS</h3>
              <p className="text-xs text-slate-500 mt-1">Elastic Kubernetes Service</p>
            </div>
            <ul className="text-xs text-slate-500 space-y-2 font-mono">
              <li>• Pure upstream Kubernetes API (kubectl)</li>
              <li>• AWS VPC CNI for Pod IP allocation</li>
              <li>• Helm, ArgoCD, & Istio Ecosystem</li>
              <li>• Requires K8s expertise & control plane fee</li>
            </ul>
          </div>
        </div>

        {/* Feature Comparison Matrix Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse table-custom">
            <thead>
              <tr className="bg-slate-50 text-xs font-mono text-slate-500 border-b border-slate-200">
                <th className="p-3">Feature Metric</th>
                <th className="p-3 text-indigo-600">Amazon EC2</th>
                <th className="p-3 text-emerald-600">Amazon ECS</th>
                <th className="p-3 text-violet-600">Amazon EKS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-xs font-mono text-slate-900">
              <tr>
                <td className="p-3 font-bold text-slate-500">Orchestration API</td>
                <td className="p-3">Auto Scaling Groups</td>
                <td className="p-3 text-emerald-600">ECS Task Definitions</td>
                <td className="p-3 text-violet-600">Kubernetes Manifests (kubectl)</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-slate-500">Networking Model</td>
                <td className="p-3">ENI per EC2 Instance</td>
                <td className="p-3">awsvpc mode (ENI per Task)</td>
                <td className="p-3">AWS VPC CNI (IP per Pod)</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-slate-500">Serverless Capacity</td>
                <td className="p-3 text-rose-600">No (Provisioned Instances)</td>
                <td className="p-3 text-emerald-600">Yes (AWS Fargate)</td>
                <td className="p-3 text-emerald-600">Yes (EKS Fargate Profiles)</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-slate-500">Management Overhead</td>
                <td className="p-3 text-rose-600">High (OS, Patches, Drivers)</td>
                <td className="p-3 text-emerald-600">Low (Fully AWS Managed)</td>
                <td className="p-3 text-amber-600">Medium-High (K8s Addons)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SUB-MODULE 5: LAMBDA SERVERLESS EXECUTION FLOW & CLOUDFRONT CDN (#lambda) */}
      {/* ========================================================================= */}
      <section
        id="lambda"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow space-y-8 shadow-xl hover:border-amber-400/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-amber-600 uppercase tracking-wider mb-1">
              Module 05 / Serverless & Edge Computing
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>🚀</span> Lambda Serverless Execution Flow & CloudFront CDN
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Event-Driven Architecture
          </span>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          <strong className="text-slate-900">AWS CloudFront</strong> caches dynamic and static assets at 600+ Edge Points of Presence (PoPs) globally. When cache misses occur, traffic routes through <strong className="text-slate-900">API Gateway</strong> to trigger <strong className="text-slate-900">AWS Lambda</strong> functions. Cold starts occur when Lambda provisions a fresh execution container environment.
        </p>

        {/* Execution Flow Simulator Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
          {/* Cold Start vs Warm Start */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-slate-500 uppercase">
              Container Provisioning State
            </label>
            <button
              onClick={() => setIsColdStart(!isColdStart)}
              className={`w-full p-2.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                isColdStart
                  ? "bg-[#ff7b72]/20 text-rose-600 border-rose-400"
                  : "bg-emerald-500/20 text-emerald-600 border-emerald-400"
              }`}
            >
              {isColdStart ? "❄️ COLD START (~350ms Init)" : "🔥 WARM CONTAINER (~15ms Execution)"}
            </button>
          </div>

          {/* CloudFront Cache State */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-slate-500 uppercase">
              CloudFront Edge Cache State
            </label>
            <button
              onClick={() => setIsCacheHit(!isCacheHit)}
              className={`w-full p-2.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                isCacheHit
                  ? "bg-indigo-100 text-indigo-600 border-indigo-400"
                  : "bg-[#ffa657]/20 text-amber-600 border-amber-400"
              }`}
            >
              {isCacheHit ? "⚡ CACHE HIT (Edge Served)" : "🌐 CACHE MISS (Origin Fetch)"}
            </button>
          </div>

          {/* Memory Allocation */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-slate-500 uppercase">
              Lambda Memory Size: {lambdaMemory} MB
            </label>
            <input
              type="range"
              min={128}
              max={3072}
              step={128}
              value={lambdaMemory}
              onChange={(e) => setLambdaMemory(Number(e.target.value))}
              className="w-full accent-[#ffa657]"
            />
          </div>
        </div>

        {/* Trigger Simulation Button */}
        <button
          onClick={runLambdaSimulation}
          disabled={isExecuting}
          className="w-full py-3 bg-[#ffa657] hover:bg-[#ffa657]/90 text-slate-900 font-extrabold rounded-xl text-xs font-mono transition-colors shadow-lg"
        >
          {isExecuting ? "Executing Pipeline..." : "⚡ Execute End-to-End API Request Flow"}
        </button>

        {/* Live CloudWatch Logs & Metrics Console */}
        <div className="rounded-xl bg-white border border-slate-200 card-shadow p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-mono font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              CloudWatch Logs Stream (/aws/lambda/api-handler)
            </h4>
            <span className="text-xs font-mono text-slate-500">Real-time Telemetry</span>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200 font-mono text-xs text-emerald-600 space-y-1.5 min-h-[160px]">
            {execLogs.length === 0 ? (
              <span className="text-slate-500 italic">
                Click &quot;Execute End-to-End API Request Flow&quot; to simulate request invocation logs...
              </span>
            ) : (
              execLogs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  {log.includes("REPORT") ? (
                    <span className="text-indigo-600 font-bold block bg-slate-50 p-2 rounded mt-2 border border-slate-200">
                      {log}
                    </span>
                  ) : log.includes("COLD START") ? (
                    <span className="text-rose-600 font-bold">{log}</span>
                  ) : log.includes("Cache HIT") ? (
                    <span className="text-indigo-600 font-bold">{log}</span>
                  ) : (
                    <span>{log}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SUB-MODULE 6: AWS COST OPTIMIZATION CALCULATOR (#cost) */}
      {/* ========================================================================= */}
      <AwsCostSection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 7: DISASTER RECOVERY & MULTI-REGION (#dr) */}
      {/* ========================================================================= */}
      <AwsDrSection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 8: SECURITY HUB & COMPLIANCE FRAMEWORK (#compliance) */}
      {/* ========================================================================= */}
      <AwsComplianceSection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 9: STEP FUNCTIONS & EVENT-DRIVEN ORCHESTRATION (#step-functions) */}
      {/* ========================================================================= */}
      <AwsStepFunctionsSection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 10: API GATEWAY & MICROSERVICES PATTERNS (#api-gateway) */}
      {/* ========================================================================= */}
      <AwsApiGatewaySection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 11: CLOUDWATCH & FULL OBSERVABILITY (#cloudwatch) */}
      {/* ========================================================================= */}
      <AwsCloudWatchSection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 12: SECRETS MANAGER & PARAMETER STORE (#secrets) */}
      {/* ========================================================================= */}
      <AwsSecretsManagerSection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 13: TRANSIT GATEWAY & HYBRID NETWORKING (#tgw) */}
      {/* ========================================================================= */}
      <AwsTransitGatewaySection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 14: AUTO SCALING & LOAD BALANCERS (#autoscaling) */}
      {/* ========================================================================= */}
      <AwsAutoScalingSection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 15: WELL-ARCHITECTED FRAMEWORK REVIEW (#well-architected) */}
      {/* ========================================================================= */}
      <AwsWellArchitectedSection />
    </div>
  );
}
