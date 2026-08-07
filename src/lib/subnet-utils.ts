export function ipToInt(ip: string): number | null {
  const p = ip.trim().split('.');
  if (p.length !== 4) return null;
  let n = 0;
  for (const x of p) {
    if (!/^\d+$/.test(x)) return null;
    const v = Number(x);
    if (v < 0 || v > 255) return null;
    n = (n * 256) + v;
  }
  return n >>> 0;
}

export function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

export function maskFromCIDR(c: number): number[] {
  if (c < 0 || c > 32) return [0, 0, 0, 0];
  const m = c === 0 ? 0 : (0xFFFFFFFF << (32 - c)) >>> 0;
  return [(m >>> 24) & 255, (m >>> 16) & 255, (m >>> 8) & 255, m & 255];
}

export interface SubnetResult {
  networkAddress: string;
  broadcastAddress: string;
  firstUsable: string;
  lastUsable: string;
  subnetMask: string;
  usableHosts: string;
}

export function calculateSubnet(ipStr: string, c: number): SubnetResult | null {
  if (c < 0 || c > 32) return null;
  const ip = ipToInt(ipStr);
  if (ip === null) return null;

  const maskArr = maskFromCIDR(c);
  const mask = c === 0 ? 0 : (0xFFFFFFFF << (32 - c)) >>> 0;
  const net = (ip & mask) >>> 0;
  const bcast = (net | (~mask >>> 0)) >>> 0;
  const total = Math.pow(2, 32 - c);
  const hosts = Math.max(total - 2, 0);

  return {
    networkAddress: intToIp(net) + '/' + c,
    broadcastAddress: intToIp(bcast),
    firstUsable: hosts ? intToIp(net + 1) : '—',
    lastUsable: hosts ? intToIp(bcast - 1) : '—',
    subnetMask: maskArr.join('.'),
    usableHosts: hosts.toLocaleString()
  };
}
