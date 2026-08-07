export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Decision = 'ALLOW' | 'STEP_UP' | 'DENY';

export interface ThreatFinding {
  threat: string;
  severity: Severity;
  rationale: string;
  mitigation: string;
  mitigated: boolean;
}

 type Asset = 'web-api' | 'database' | 'object-storage' | 'identity-provider' | 'message-queue';
 type ThreatTemplate = Omit<ThreatFinding, 'mitigated'>;

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const THREATS_BY_ASSET: Record<Asset, ThreatTemplate[]> = {
  'web-api': [
    { threat: 'Spoofing', severity: 'high', rationale: 'An attacker may impersonate a caller when identity checks are weak.', mitigation: 'strong-authentication' },
    { threat: 'Tampering', severity: 'high', rationale: 'Untrusted request data can alter application state.', mitigation: 'input-validation' },
    { threat: 'Repudiation', severity: 'medium', rationale: 'Without an audit trail, actions cannot be reliably attributed.', mitigation: 'audit-logging' },
    { threat: 'Information disclosure', severity: 'high', rationale: 'Overly broad responses can expose data to unauthorized callers.', mitigation: 'object-authorization' },
    { threat: 'Denial of service', severity: 'high', rationale: 'Unbounded requests can exhaust API capacity.', mitigation: 'rate-limiting' },
    { threat: 'Elevation of privilege', severity: 'critical', rationale: 'A compromised endpoint may grant actions beyond the caller role.', mitigation: 'least-privilege' },
  ],
  database: [
    { threat: 'Spoofing', severity: 'high', rationale: 'Stolen database credentials can impersonate trusted clients.', mitigation: 'strong-authentication' },
    { threat: 'Tampering', severity: 'critical', rationale: 'Unauthorized writes can corrupt records and business state.', mitigation: 'integrity-controls' },
    { threat: 'Repudiation', severity: 'medium', rationale: 'Missing query attribution weakens forensic investigations.', mitigation: 'audit-logging' },
    { threat: 'Information disclosure', severity: 'critical', rationale: 'Unencrypted records expose sensitive data after a read or backup breach.', mitigation: 'encryption-at-rest' },
    { threat: 'Denial of service', severity: 'high', rationale: 'Resource exhaustion can make the data service unavailable.', mitigation: 'backup-and-recovery' },
    { threat: 'Elevation of privilege', severity: 'critical', rationale: 'Excessive database roles can turn a limited account into an administrator.', mitigation: 'least-privilege' },
  ],
  'object-storage': [
    { threat: 'Spoofing', severity: 'high', rationale: 'Weak bucket credentials can let an attacker act as a trusted client.', mitigation: 'strong-authentication' },
    { threat: 'Tampering', severity: 'high', rationale: 'Objects may be overwritten or deleted without integrity protections.', mitigation: 'object-versioning' },
    { threat: 'Repudiation', severity: 'medium', rationale: 'Without object access logs, reads and writes cannot be attributed.', mitigation: 'audit-logging' },
    { threat: 'Information disclosure', severity: 'critical', rationale: 'Public or overly broad bucket access can expose stored objects.', mitigation: 'public-access-block' },
    { threat: 'Denial of service', severity: 'medium', rationale: 'Deletion or quota abuse can make required objects unavailable.', mitigation: 'backup-and-recovery' },
    { threat: 'Elevation of privilege', severity: 'high', rationale: 'Broad bucket policies can let a caller access unrelated objects.', mitigation: 'least-privilege' },
  ],
  'identity-provider': [
    { threat: 'Spoofing', severity: 'critical', rationale: 'Account takeover begins when authentication can be bypassed.', mitigation: 'multi-factor-authentication' },
    { threat: 'Tampering', severity: 'critical', rationale: 'Forged or altered tokens can change the identity and permissions presented to services.', mitigation: 'token-integrity' },
    { threat: 'Repudiation', severity: 'medium', rationale: 'Unlogged sign-ins and administrative changes weaken accountability.', mitigation: 'audit-logging' },
    { threat: 'Information disclosure', severity: 'high', rationale: 'Sessions and identity claims can leak personal or authorization data.', mitigation: 'secure-session-management' },
    { threat: 'Denial of service', severity: 'high', rationale: 'Authentication flooding can prevent legitimate users from signing in.', mitigation: 'rate-limiting' },
    { threat: 'Elevation of privilege', severity: 'critical', rationale: 'Role assignment flaws can grant administrator permissions.', mitigation: 'role-separation' },
  ],
  'message-queue': [
    { threat: 'Spoofing', severity: 'high', rationale: 'Untrusted producers or consumers may impersonate a workload.', mitigation: 'mutual-authentication' },
    { threat: 'Tampering', severity: 'high', rationale: 'Messages can be altered in transit or before consumption.', mitigation: 'message-integrity' },
    { threat: 'Repudiation', severity: 'medium', rationale: 'Missing producer and consumer records make message actions untraceable.', mitigation: 'audit-logging' },
    { threat: 'Information disclosure', severity: 'high', rationale: 'Queue payloads may expose sensitive data to unauthorized consumers.', mitigation: 'encryption-in-transit' },
    { threat: 'Denial of service', severity: 'high', rationale: 'A producer can flood a queue and delay legitimate work.', mitigation: 'queue-quotas' },
    { threat: 'Elevation of privilege', severity: 'critical', rationale: 'Broad queue permissions can allow a workload to publish or consume unrelated data.', mitigation: 'least-privilege' },
  ],
};

function wildcardMatch(value: string, pattern: string): boolean {
  const escaped = pattern.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i').test(value);
}

function mitigationMatches(mitigations: Set<string>, mitigation: string, threat: string): boolean {
  for (const candidate of mitigations) {
    if (wildcardMatch(mitigation, candidate) || wildcardMatch(threat, candidate)) return true;
  }
  return false;
}

export function evaluateThreatModel(asset: Asset, mitigations: Set<string>): ThreatFinding[] {
  const templates = THREATS_BY_ASSET[asset];
  if (!templates) {
    return [{
      threat: 'Unsupported asset',
      severity: 'medium',
      rationale: 'Unsupported asset input cannot be evaluated safely.',
      mitigation: 'asset-validation',
      mitigated: false,
    }];
  }
  return templates
    .map((template) => ({ ...template, mitigated: mitigationMatches(mitigations, template.mitigation, template.threat) }))
    .sort((left, right) => SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]);
}

export interface IamRequest {
  principal: string;
  action: string;
  resource: string;
  mfa: boolean;
  source: 'corporate' | 'internet' | 'service';
}

export interface IamPolicyRule {
  effect: 'Allow' | 'Deny';
  principal: string;
  action: string;
  resource: string;
  requireMfa?: boolean;
}

function iamRuleMatches(request: IamRequest, rule: IamPolicyRule): boolean {
  return wildcardMatch(request.principal, rule.principal)
    && wildcardMatch(request.action, rule.action)
    && wildcardMatch(request.resource, rule.resource);
}

export function evaluateIamRequest(request: IamRequest, rules: IamPolicyRule[]): {
  decision: 'ALLOW' | 'DENY';
  matchedRule: IamPolicyRule | null;
  reason: string;
} {
  const baseMatches = rules.filter((rule) => iamRuleMatches(request, rule));
  const matches = baseMatches.filter((rule) => !rule.requireMfa || request.mfa);
  const deny = matches.find((rule) => rule.effect === 'Deny');
  if (deny) return { decision: 'DENY', matchedRule: deny, reason: 'Explicit Deny rule overrides all Allow rules.' };

  const allow = matches.find((rule) => rule.effect === 'Allow');
  if (allow) return { decision: 'ALLOW', matchedRule: allow, reason: 'Request matches an Allow rule and all conditions are satisfied.' };

  const mfaRequired = baseMatches.find((rule) => rule.effect === 'Allow' && rule.requireMfa && !request.mfa);
  if (mfaRequired) return { decision: 'DENY', matchedRule: mfaRequired, reason: 'MFA is required by the matched Allow rule.' };

  return { decision: 'DENY', matchedRule: null, reason: 'No matching policy rule grants this request.' };
}

export function evaluateApiRequest(input: {
  endpoint: 'account' | 'orders' | 'admin' | 'upload';
  authenticated: boolean;
  ownsObject: boolean;
  bodyValid: boolean;
  rateWithinLimit: boolean;
}): { decision: 'ALLOW' | 'BLOCK'; finding: string; control: string } {
  if (!input.rateWithinLimit) return { decision: 'BLOCK', finding: 'Request rate exceeds the endpoint limit.', control: 'Rate limiting' };
  if (!input.authenticated) return { decision: 'BLOCK', finding: 'Request has no verified identity.', control: 'Authentication' };
  if (input.endpoint === 'orders' && !input.ownsObject) return { decision: 'BLOCK', finding: 'Caller does not own the requested order.', control: 'Object-level authorization' };
  if (!input.bodyValid) return { decision: 'BLOCK', finding: 'Request body fails schema validation.', control: 'Input validation' };
  return { decision: 'ALLOW', finding: 'Request satisfies authentication, authorization, validation, and rate controls.', control: 'Layered API controls' };
}

export function evaluateZeroTrustRequest(input: {
  identityVerified: boolean;
  deviceCompliant: boolean;
  destination: 'public' | 'application' | 'data' | 'management' | 'third-party';
  sourceZone: 'internet' | 'workforce' | 'workload' | 'partner';
  mfa: boolean;
}): { decision: Decision; reason: string } {
  if (!input.identityVerified) return { decision: 'DENY', reason: 'Verified identity is required before access.' };
  if (!input.deviceCompliant) return { decision: 'DENY', reason: 'Only compliant devices may access protected resources.' };
  if ((input.destination === 'data' || input.destination === 'management') && input.sourceZone === 'internet') {
    return { decision: 'DENY', reason: 'Internet-originated requests cannot directly reach sensitive resources.' };
  }
  if ((input.destination === 'data' || input.destination === 'management' || input.destination === 'third-party') && !input.mfa) {
    return { decision: 'STEP_UP', reason: 'MFA step-up is required for sensitive data access.' };
  }
  return { decision: 'ALLOW', reason: 'Identity, device, source-zone, and destination checks are satisfied.' };
}

export function scoreIncidentResponse(input: {
  severity: Severity;
  contained: boolean;
  evidencePreserved: boolean;
  affectedAssets: number;
  lifecycleStepsCompleted: string[];
}): { score: number; priority: string; nextAction: string } {
  let score = ({ critical: 100, high: 80, medium: 60, low: 40 } as Record<Severity, number>)[input.severity];
  if (!input.contained) score -= 25;
  if (!input.evidencePreserved) score -= 20;
  score -= Math.min(25, Math.max(0, input.affectedAssets) * 5);

  const completed = new Set(input.lifecycleStepsCompleted.map((step) => step.trim().toLowerCase().replace(/[_ ]/g, '-')));
  const requiredSteps = ['identify', 'contain', 'eradicate', 'recover', 'lessons-learned'];
  score -= requiredSteps.filter((step) => !completed.has(step)).length * 6;
  score = Math.max(0, Math.min(100, score));

  const priority = score >= 85 ? 'P1' : score >= 65 ? 'P2' : score >= 40 ? 'P3' : 'P4';
  let nextAction = 'Conduct post-incident review.';
  if (!input.contained) nextAction = 'Contain affected assets.';
  else if (!input.evidencePreserved) nextAction = 'Preserve forensic evidence.';
  else {
    const missing = requiredSteps.find((step) => !completed.has(step));
    if (missing) nextAction = `Complete incident lifecycle step: ${missing}.`;
  }
  return { score, priority, nextAction };
}

export function detectSiemEvents(events: Array<{ id: string; kind: string; user: string; sourceIp: string; failedAttempts: number; privilegeChange: boolean; bytesOut: number }>, rule: 'credential-stuffing' | 'privilege-escalation' | 'data-exfiltration'): string[] {
  return events.filter((event) => {
    if (rule === 'credential-stuffing') return event.failedAttempts >= 5;
    if (rule === 'privilege-escalation') return event.privilegeChange;
    return event.bytesOut >= 1_000_000;
  }).map((event) => event.id);
}

export function evaluateSbom(input: { dependencies: Array<{ name: string; version: string; severity: Severity | 'none'; pinned: boolean; signed: boolean; license: string }>; allowLicenses: string[] }): { verdict: 'PASS' | 'WARN' | 'BLOCK'; findings: string[] } {
  const findings: string[] = [];
  let blocked = false;
  let warned = false;
  const allowed = new Set(input.allowLicenses);

  for (const dependency of input.dependencies) {
    if (dependency.severity === 'critical' || dependency.severity === 'high') {
      findings.push(`${dependency.name} has a ${dependency.severity} vulnerability.`);
      blocked = true;
    } else if (dependency.severity === 'medium' || dependency.severity === 'low') {
      findings.push(`${dependency.name} has a ${dependency.severity} vulnerability.`);
      warned = true;
    }
    if (!dependency.pinned) {
      findings.push(`${dependency.name} is not pinned to an immutable version.`);
      warned = true;
    }
    if (!dependency.signed) {
      findings.push(`${dependency.name} is not signed.`);
      blocked = true;
    }
    if (!allowed.has(dependency.license)) {
      findings.push(`${dependency.name} uses disallowed license ${dependency.license}.`);
      blocked = true;
    }
  }
  return { verdict: blocked ? 'BLOCK' : warned ? 'WARN' : 'PASS', findings };
}

export function evaluateContainerAdmission(input: { nonRoot: boolean; readOnlyRoot: boolean; droppedCapabilities: boolean; hostNetwork: boolean; hostPath: boolean; signedImage: boolean; resourceLimits: boolean }): { admitted: boolean; findings: string[] } {
  const findings: string[] = [];
  if (!input.nonRoot) findings.push('Container must run as a non-root user.');
  if (!input.readOnlyRoot) findings.push('Container root filesystem must be read-only.');
  if (!input.droppedCapabilities) findings.push('Linux capabilities must be dropped by default.');
  if (input.hostNetwork) findings.push('Host networking is not permitted.');
  if (input.hostPath) findings.push('Host path mounts are not permitted.');
  if (!input.signedImage) findings.push('Image signature verification is required.');
  if (!input.resourceLimits) findings.push('CPU and memory limits are required.');
  return { admitted: findings.length === 0, findings };
}

export function scoreCloudPosture(findings: Array<{ id: string; severity: Severity; resource: string; publicExposure: boolean; fixed: boolean }>): { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F'; openFindings: number } {
  const penalty: Record<Severity, number> = { critical: 30, high: 20, medium: 10, low: 5 };
  const openFindings = Array.isArray(findings) ? findings.filter((finding) => !finding.fixed) : [];
  const risk = openFindings.reduce((total, finding) => total + (penalty[finding.severity] ?? 0) + (finding.publicExposure ? 10 : 0), 0);
  const rawScore = 100 - risk;
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 0;
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 50 ? 'D' : 'F';
  return { score, grade, openFindings: openFindings.length };
}

export function controlsForDataClass(classification: 'public' | 'internal' | 'confidential' | 'restricted'): { encryption: string; access: string; retention: string; audit: string; masking: string } {
  const controls: Record<typeof classification, { encryption: string; access: string; retention: string; audit: string; masking: string }> = {
    public: {
      encryption: 'Encryption at rest optional; use TLS in transit.',
      access: 'Public read access may be permitted; restrict writes.',
      retention: 'Short, documented retention period.',
      audit: 'Basic access logging.',
      masking: 'No masking required for approved public data.',
    },
    internal: {
      encryption: 'Encrypt data at rest and in transit.',
      access: 'Authenticated workforce access with least privilege.',
      retention: 'Defined business retention period.',
      audit: 'Access and change audit logs.',
      masking: 'Mask sensitive fields in non-production environments.',
    },
    confidential: {
      encryption: 'Strong encryption at rest and in transit.',
      access: 'Role-based access with MFA.',
      retention: 'Minimize retention and support legal holds.',
      audit: 'Detailed immutable audit logs.',
      masking: 'Default masking or tokenization outside production.',
    },
    restricted: {
      encryption: 'Customer-managed encryption keys with envelope encryption.',
      access: 'Explicit allowlist with MFA and just-in-time access.',
      retention: 'Shortest necessary retention with deletion proof.',
      audit: 'Continuous immutable audit logging with alerting.',
      masking: 'Always tokenize or redact restricted values.',
    },
  };
  return controls[classification] ?? {
    encryption: 'Unsupported classification; deny processing until classification is corrected.',
    access: 'Unsupported classification; deny access until classification is corrected.',
    retention: 'Unsupported classification; retain only until classification is corrected.',
    audit: 'Unsupported classification; record access and classification changes.',
    masking: 'Unsupported classification; mask values by default.',
  };
}
