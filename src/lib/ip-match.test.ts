import { describe, test, expect } from 'vitest';
import { ipInCidr, ipToLong } from './ip-match';

describe('ip-match', () => {
  describe('ipToLong', () => {
    test('converts dotted decimal to an unsigned 32-bit value', () => {
      expect(ipToLong('0.0.0.0')).toBe(0);
      expect(ipToLong('10.0.1.5')).toBe(167772421);
      expect(ipToLong('255.255.255.255')).toBe(4294967295);
    });

    test('returns null for malformed addresses', () => {
      expect(ipToLong('garbage')).toBeNull();
      expect(ipToLong('10.0.0')).toBeNull();
      expect(ipToLong('10.0.0.1.1')).toBeNull();
      expect(ipToLong('10.0..1')).toBeNull();
      expect(ipToLong('999.1.1.1')).toBeNull();
      expect(ipToLong('-1.0.0.0')).toBeNull();
    });
  });

  describe('ipInCidr', () => {
    test('matches non-octet-aligned prefixes', () => {
      // /28 block is 10.0.1.0 - 10.0.1.15
      expect(ipInCidr('10.0.1.5', '10.0.1.0/28')).toBe(true);
      expect(ipInCidr('10.0.1.15', '10.0.1.0/28')).toBe(true);
      expect(ipInCidr('10.0.1.20', '10.0.1.0/28')).toBe(false);
    });

    test('respects /20 block boundaries across the third octet', () => {
      // /20 block is 172.16.16.0 - 172.16.31.255
      expect(ipInCidr('172.16.31.255', '172.16.16.0/20')).toBe(true);
      expect(ipInCidr('172.16.32.0', '172.16.16.0/20')).toBe(false);
      expect(ipInCidr('172.16.15.255', '172.16.16.0/20')).toBe(false);
    });

    test('handles the /31 pair and /32 host route', () => {
      expect(ipInCidr('192.168.1.1', '192.168.1.0/31')).toBe(true);
      expect(ipInCidr('192.168.1.2', '192.168.1.0/31')).toBe(false);
      expect(ipInCidr('192.168.1.1', '192.168.1.1/32')).toBe(true);
      expect(ipInCidr('192.168.1.2', '192.168.1.1/32')).toBe(false);
    });

    test('treats a bare address as a host route', () => {
      expect(ipInCidr('192.168.1.1', '192.168.1.1')).toBe(true);
      expect(ipInCidr('192.168.1.2', '192.168.1.1')).toBe(false);
    });

    test('matches every address under /0', () => {
      expect(ipInCidr('0.0.0.0', '0.0.0.0/0')).toBe(true);
      expect(ipInCidr('203.0.113.50', '0.0.0.0/0')).toBe(true);
      expect(ipInCidr('255.255.255.255', '10.20.30.40/0')).toBe(true);
    });

    test('rejects malformed inputs instead of matching', () => {
      expect(ipInCidr('10.0.0.1', 'garbage')).toBe(false);
      expect(ipInCidr('garbage', '10.0.0.0/8')).toBe(false);
      expect(ipInCidr('10.0.0.1', '10.0.0.0/33')).toBe(false);
      expect(ipInCidr('10.0.0.1', '10.0.0.0/-1')).toBe(false);
      expect(ipInCidr('10.0.0.1', '10.0.0.0/')).toBe(false);
      expect(ipInCidr('10.0.0.1', '999.1.1.1/24')).toBe(false);
      expect(ipInCidr('10.0.0.1', '10.0.0.0/8/8')).toBe(false);
    });
  });
});
