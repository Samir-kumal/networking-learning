/**
 * Generic IPv4 prefix math shared by the networking simulators.
 *
 * Kept deliberately small: callers that need the numeric network, the mask, or
 * the prefix length (e.g. longest-prefix-match sorting) should parse the CIDR
 * themselves rather than bending these helpers.
 */

/**
 * Converts a dotted-quad IPv4 string to an unsigned 32-bit number.
 * Returns null unless the input is exactly four decimal octets in 0-255.
 */
export function ipToLong(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;

  let num = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    num = num * 256 + octet;
  }
  return num >>> 0;
}

/**
 * Tests whether `ip` falls inside `cidr` for any prefix length 0-32.
 * A bare address (no "/") is treated as a /32 host route.
 * Malformed addresses, malformed networks, and out-of-range prefixes are false.
 */
export function ipInCidr(ip: string, cidr: string): boolean {
  const ipLong = ipToLong(ip);
  if (ipLong === null) return false;

  const parts = cidr.trim().split("/");
  if (parts.length > 2) return false;

  const netLong = ipToLong(parts[0]);
  if (netLong === null) return false;

  let prefix = 32;
  if (parts.length === 2) {
    if (!/^\d+$/.test(parts[1].trim())) return false;
    prefix = Number(parts[1].trim());
    if (prefix > 32) return false;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return ((ipLong & mask) >>> 0) === ((netLong & mask) >>> 0);
}
