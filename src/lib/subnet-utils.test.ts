import { describe, test, expect } from 'vitest';
import { ipToInt, intToIp, maskFromCIDR, calculateSubnet } from './subnet-utils';

describe('subnet-utils', () => {
  describe('ipToInt', () => {
    test('converts dotted decimal correctly', () => {
      expect(ipToInt('192.168.1.130')).toBe(3232235906);
      expect(ipToInt('0.0.0.0')).toBe(0);
      expect(ipToInt('255.255.255.255')).toBe(4294967295);
    });

    test('returns null for invalid inputs', () => {
      expect(ipToInt('256.0.0.1')).toBeNull();
      expect(ipToInt('invalid')).toBeNull();
      expect(ipToInt('192.168.1')).toBeNull();
      expect(ipToInt('192.168.1.1.1')).toBeNull();
      expect(ipToInt('-1.0.0.0')).toBeNull();
      expect(ipToInt('abc.def.ghi.jkl')).toBeNull();
    });
  });

  describe('intToIp', () => {
    test('converts unsigned int to dotted decimal string', () => {
      expect(intToIp(3232235906)).toBe('192.168.1.130');
      expect(intToIp(0)).toBe('0.0.0.0');
      expect(intToIp(4294967295)).toBe('255.255.255.255');
    });
  });

  describe('maskFromCIDR', () => {
    test('returns correct octet array for various CIDR prefixes', () => {
      expect(maskFromCIDR(0)).toEqual([0, 0, 0, 0]);
      expect(maskFromCIDR(8)).toEqual([255, 0, 0, 0]);
      expect(maskFromCIDR(16)).toEqual([255, 255, 0, 0]);
      expect(maskFromCIDR(24)).toEqual([255, 255, 255, 0]);
      expect(maskFromCIDR(27)).toEqual([255, 255, 255, 224]);
      expect(maskFromCIDR(30)).toEqual([255, 255, 255, 252]);
      expect(maskFromCIDR(32)).toEqual([255, 255, 255, 255]);
    });

    test('handles invalid CIDR ranges gracefully', () => {
      expect(maskFromCIDR(-1)).toEqual([0, 0, 0, 0]);
      expect(maskFromCIDR(33)).toEqual([0, 0, 0, 0]);
    });
  });

  describe('calculateSubnet', () => {
    test('returns correct values for 192.168.1.130/24', () => {
      const res = calculateSubnet('192.168.1.130', 24);
      expect(res).not.toBeNull();
      if (res) {
        expect(res.networkAddress).toBe('192.168.1.0/24');
        expect(res.broadcastAddress).toBe('192.168.1.255');
        expect(res.firstUsable).toBe('192.168.1.1');
        expect(res.lastUsable).toBe('192.168.1.254');
        expect(res.subnetMask).toBe('255.255.255.0');
        expect(res.usableHosts).toBe('254');
      }
    });

    test('returns correct values for 10.0.0.15/8', () => {
      const res = calculateSubnet('10.0.0.15', 8);
      expect(res).not.toBeNull();
      if (res) {
        expect(res.networkAddress).toBe('10.0.0.0/8');
        expect(res.broadcastAddress).toBe('10.255.255.255');
        expect(res.firstUsable).toBe('10.0.0.1');
        expect(res.lastUsable).toBe('10.255.255.254');
        expect(res.subnetMask).toBe('255.0.0.0');
        expect(res.usableHosts).toBe('16,777,214');
      }
    });

    test('returns null for invalid inputs', () => {
      expect(calculateSubnet('invalid.ip', 24)).toBeNull();
      expect(calculateSubnet('192.168.1.1', -1)).toBeNull();
      expect(calculateSubnet('192.168.1.1', 33)).toBeNull();
    });
  });
});
