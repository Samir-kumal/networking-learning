import { describe, expect, test } from 'vitest';
import {
  controlsForDataClass,
  detectSiemEvents,
  evaluateApiRequest,
  evaluateContainerAdmission,
  evaluateIamRequest,
  evaluateSbom,
  evaluateThreatModel,
  evaluateZeroTrustRequest,
  scoreCloudPosture,
  scoreIncidentResponse,
} from './security-evaluators';

describe('security evaluators', () => {
  test('reports STRIDE findings and applies matching mitigations', () => {
    const before = evaluateThreatModel('web-api', new Set());
    const after = evaluateThreatModel('web-api', new Set(['input-validation']));

    expect(before.length).toBeGreaterThan(0);
    expect(after.length).toBe(before.length);
    expect(after.find((finding) => finding.mitigation === 'input-validation')?.mitigated).toBe(true);
    expect(after.some((finding) => finding.mitigated)).toBe(true);
  });

  test('explicit IAM Deny overrides Allow', () => {
    const result = evaluateIamRequest(
      { principal: 'analyst', action: 's3:DeleteObject', resource: 'arn:aws:s3:::private/*', mfa: true, source: 'corporate' },
      [
        { effect: 'Allow', principal: 'analyst', action: 's3:*', resource: 'arn:aws:s3:::private/*' },
        { effect: 'Deny', principal: 'analyst', action: 's3:DeleteObject', resource: 'arn:aws:s3:::private/*' },
      ],
    );
    expect(result.decision).toBe('DENY');
    expect(result.matchedRule?.effect).toBe('Deny');
  });

  test('requires MFA for a matching IAM rule', () => {
    const result = evaluateIamRequest(
      { principal: 'analyst', action: 'read', resource: 'reports', mfa: false, source: 'corporate' },
      [{ effect: 'Allow', principal: '*', action: 'read', resource: 'reports', requireMfa: true }],
    );
    expect(result.decision).toBe('DENY');
    expect(result.reason).toContain('MFA');
  });

  test('blocks non-owner API object access', () => {
    expect(evaluateApiRequest({ endpoint: 'orders', authenticated: true, ownsObject: false, bodyValid: true, rateWithinLimit: true }).decision).toBe('BLOCK');
  });

  test('blocks invalid API bodies and excessive request rates', () => {
    expect(evaluateApiRequest({ endpoint: 'upload', authenticated: true, ownsObject: true, bodyValid: false, rateWithinLimit: true }).control).toContain('validation');
    expect(evaluateApiRequest({ endpoint: 'account', authenticated: true, ownsObject: true, bodyValid: true, rateWithinLimit: false }).control).toMatch(/rate/i);
  });

  test('returns a Zero Trust step-up decision for sensitive access without MFA', () => {
    expect(evaluateZeroTrustRequest({ identityVerified: true, deviceCompliant: true, destination: 'data', sourceZone: 'workforce', mfa: false })).toEqual({
      decision: 'STEP_UP',
      reason: 'MFA step-up is required for sensitive data access.',
    });
  });

  test('denies unverified Zero Trust identity', () => {
    expect(evaluateZeroTrustRequest({ identityVerified: false, deviceCompliant: true, destination: 'application', sourceZone: 'workforce', mfa: true }).decision).toBe('DENY');
  });

  test('degrades incident score when containment and evidence are incomplete', () => {
    const complete = scoreIncidentResponse({ severity: 'high', contained: true, evidencePreserved: true, affectedAssets: 1, lifecycleStepsCompleted: ['identify', 'contain', 'eradicate', 'recover', 'lessons-learned'] });
    const incomplete = scoreIncidentResponse({ severity: 'high', contained: false, evidencePreserved: false, affectedAssets: 4, lifecycleStepsCompleted: [] });
    expect(complete.score).toBeGreaterThan(incomplete.score);
    expect(incomplete.nextAction).toBe('Contain affected assets.');
    expect(complete.score).toBeLessThanOrEqual(100);
    expect(incomplete.score).toBeGreaterThanOrEqual(0);
  });

  test('matches each SIEM detection rule deterministically', () => {
    const events = [
      { id: 'auth-1', kind: 'login', user: 'alex', sourceIp: '203.0.113.4', failedAttempts: 8, privilegeChange: false, bytesOut: 0 },
      { id: 'admin-1', kind: 'role-change', user: 'sam', sourceIp: '10.0.0.4', failedAttempts: 0, privilegeChange: true, bytesOut: 0 },
      { id: 'egress-1', kind: 'download', user: 'data-job', sourceIp: '10.0.0.5', failedAttempts: 0, privilegeChange: false, bytesOut: 2_000_000 },
      { id: 'normal-1', kind: 'read', user: 'alex', sourceIp: '10.0.0.6', failedAttempts: 1, privilegeChange: false, bytesOut: 12_000 },
    ];
    expect(detectSiemEvents(events, 'credential-stuffing')).toEqual(['auth-1']);
    expect(detectSiemEvents(events, 'privilege-escalation')).toEqual(['admin-1']);
    expect(detectSiemEvents(events, 'data-exfiltration')).toEqual(['egress-1']);
  });

  test('blocks unsafe SBOM dependencies and warns on weaker hygiene', () => {
    const safe = evaluateSbom({ dependencies: [{ name: 'safe-lib', version: '1.2.3', severity: 'none', pinned: true, signed: true, license: 'MIT' }], allowLicenses: ['MIT'] });
    expect(safe).toEqual({ verdict: 'PASS', findings: [] });

    const result = evaluateSbom({
      dependencies: [
        { name: 'critical-lib', version: '4.0.0', severity: 'critical', pinned: true, signed: true, license: 'MIT' },
        { name: 'floating-lib', version: 'latest', severity: 'none', pinned: false, signed: true, license: 'MIT' },
      ],
      allowLicenses: ['MIT'],
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.findings.some((finding) => finding.includes('critical-lib'))).toBe(true);
    expect(result.findings.some((finding) => finding.includes('floating-lib'))).toBe(true);
  });

  test('rejects insecure container admission', () => {
    expect(evaluateContainerAdmission({ nonRoot: false, readOnlyRoot: false, droppedCapabilities: false, hostNetwork: true, hostPath: true, signedImage: false, resourceLimits: false }).admitted).toBe(false);
  });

  test('admits a container that satisfies every required control', () => {
    expect(evaluateContainerAdmission({ nonRoot: true, readOnlyRoot: true, droppedCapabilities: true, hostNetwork: false, hostPath: false, signedImage: true, resourceLimits: true })).toEqual({ admitted: true, findings: [] });
  });

  test('calculates cloud posture score, open finding count, and grade', () => {
    expect(scoreCloudPosture([])).toEqual({ score: 100, grade: 'A', openFindings: 0 });
    const result = scoreCloudPosture([
      { id: 'public-db', severity: 'critical', resource: 'database', publicExposure: true, fixed: false },
      { id: 'fixed-low', severity: 'low', resource: 'bucket', publicExposure: true, fixed: true },
    ]);
    expect(result.openFindings).toBe(1);
    expect(result.score).toBeLessThan(100);
    expect(result.grade).toBe('D');
  });

  test('maps privacy controls from public through restricted data classes', () => {
    const publicControls = controlsForDataClass('public');
    const restrictedControls = controlsForDataClass('restricted');
    expect(publicControls.encryption).toContain('optional');
    expect(restrictedControls.encryption).toMatch(/customer-managed/i);
    expect(restrictedControls.access).toContain('MFA');
    expect(restrictedControls.masking).toContain('tokenize');
  });

  test('returns an explanatory finding for a runtime-invalid threat asset', () => {
    const result = evaluateThreatModel('unknown-asset' as never, new Set());
    expect(result).toHaveLength(1);
    expect(result[0].mitigated).toBe(false);
    expect(result[0].rationale).toContain('Unsupported');
  });

  test('ignores an inapplicable MFA conditional when an unconditional IAM Allow matches', () => {
    const result = evaluateIamRequest(
      { principal: 'analyst', action: 'read', resource: 'reports', mfa: false, source: 'corporate' },
      [
        { effect: 'Allow', principal: '*', action: 'read', resource: 'reports', requireMfa: true },
        { effect: 'Allow', principal: '*', action: 'read', resource: 'reports' },
      ],
    );
    expect(result.decision).toBe('ALLOW');
    expect(result.matchedRule?.requireMfa).toBeUndefined();
  });

  test('bounds cloud posture results for runtime-invalid severities', () => {
    const result = scoreCloudPosture([
      { id: 'unknown', severity: 'urgent' as never, resource: 'bucket', publicExposure: true, fixed: false },
    ]);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
    expect(result.openFindings).toBe(1);
  });

  test('returns safe privacy controls for a runtime-invalid classification', () => {
    const result = controlsForDataClass('unknown' as never);
    expect(Object.values(result).every((value) => typeof value === 'string')).toBe(true);
    expect(result.access).toContain('Unsupported');
  });
});
