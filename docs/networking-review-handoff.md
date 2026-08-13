# Networking Review Handoff

## Purpose

Provide a repeatable handoff for auditing the Networking track for factual accuracy, unsupported assumptions, and beginner-friendly sequencing.

This document is a review baseline, not a substitute for re-checking claims. A new session MUST inspect the current repository and re-derive the module inventory before editing.

## Repository scope

- Networking page: `src/app/networking/page.tsx`
- Networking tests: `src/app/networking/page.test.tsx`
- Networking modules: `src/components/sections/*.tsx`
- Sidebar navigation: `src/components/Sidebar.tsx`
- Networking utilities: `src/lib/`
- Repository rules: `AGENTS.md`

If code changes are required, read the applicable Next.js guidance under `node_modules/next/dist/docs/` before editing.

## Current curriculum order

| Order | Group | Anchor | Component | Topic |
|---:|---|---|---|---|
| 1 | Foundations | `basics` | `BasicsSection` | Subnets and network boundaries |
| 2 | Foundations | `binary` | `BinarySection` | IPv4 addresses and binary |
| 3 | Foundations | `cidr` | `CidrSection` | CIDR and subnet masks |
| 4 | Foundations | `calculator` | `SubnetCalculator` | Subnet calculations |
| 5 | Foundations | `create` | `CreateSubnetSection` | Local subnet creation |
| 6 | Foundations | `vlsm` | `VlsmSection` | Variable-length subnet masking |
| 7 | Foundations | `supernetting` | `SupernetSection` | Route aggregation |
| 8 | Applied | `vlans` | `VlanSection` | VLANs and inter-VLAN routing |
| 9 | Applied | `dhcp` | `DhcpSection` | DHCP exchange and relay |
| 10 | Applied | `ipv6` | `Ipv6Section` | IPv6 addressing and allocation |
| 11 | Applied | `ips` | `NatSection` | Public/private IPv4 and NAT |
| 12 | Applied | `cloud` | `CloudSubnetSection` | AWS, Azure, and Google Cloud subnets |
| 13 | Applied | `wireless` | `WirelessSection` | Wireless architecture and RF planning |
| 14 | Operations | `packets` | `PacketSection` | Packet layers and inspection |
| 15 | Operations | `routing` | `RoutingSection` | Forwarding, routing protocols, and FHRP |
| 16 | Operations | `firewall` | `FirewallSection` | Firewall and ACL policy |
| 17 | Operations | `security` | `SecuritySection` | Security groups, VPNs, and VXLAN |
| 18 | Operations | `diagnostics` | `DiagnosticsSection` | Diagnostic commands |
| 19 | Operations | `troubleshooting` | `TroubleshootingSection` | Common failure scenarios |
| 20 | Operations | `containers` | `ContainerSection` | Docker and Kubernetes networking |
| 21 | Evaluation | `practice` | `PracticeSection` | Guided subnetting practice |
| 22 | Evaluation | `cheatsheet` | `CheatSheetSection` | Reference formulas |
| 23 | Evaluation | `quiz` | `QuizSection` | Knowledge check |

The intended prerequisite flow is:

1. Learn the address model.
2. Calculate and design IPv4 networks.
3. Apply the model to VLANs, DHCP, IPv6, NAT, cloud, and wireless.
4. Read packet structure before studying forwarding and policy.
5. Finish with diagnostics, troubleshooting, containers, and review.

## Review procedure

### 1. Discover the actual scope

- Read `src/app/networking/page.tsx` completely.
- Enumerate every rendered module, group, anchor, and import.
- Compare the page inventory with `Sidebar.tsx` and `page.test.tsx`.
- Detect newly added or missing modules instead of trusting this document's list.
- Confirm every sidebar anchor is rendered exactly once.

### 2. Audit factual claims

Read every networking module completely. Identify claims involving:

- IPv4, IPv6, CIDR, VLSM, subnetting, and address semantics.
- VLANs, DHCP, routing, NAT, firewalls, and ACLs.
- AWS, Azure, and Google Cloud networking behavior.
- Wi-Fi standards, channel widths, RF behavior, and throughput.
- VPNs, WireGuard, IPsec, VXLAN, Docker, and Kubernetes.
- Protocol timers, packet fields, port numbers, address reservations, and defaults.

Classify each claim as one of:

- Confirmed.
- Confirmed but needs qualification.
- Incorrect.
- Ambiguous or implementation-dependent.
- Requires a source.

For every non-trivial claim, distinguish between:

- Protocol-standard behavior.
- Vendor or provider behavior.
- Common default.
- Illustrative example.
- Local simulator behavior.

Do not turn an unknown or deployment-dependent behavior into a universal statement.

### 3. Review wording

Pay particular attention to absolute language:

- `always`
- `never`
- `exactly`
- `only`
- `guarantees`
- `secure`
- `automatically`
- `seamless`

Replace absolute wording when the result depends on configuration, implementation, protocol version, hardware, operating system, provider, or regulatory domain.

### 4. Review beginner sequencing

Keep prerequisites before dependent concepts. The current intended order is:

- Fundamentals before subnet calculations.
- Subnet calculations before VLAN and cloud design.
- Packet structure before routing and filtering.
- Routing before firewall and security policy.
- Core networking before container networking.
- Practice and quiz last.

If changing the order, update both `page.tsx` and `page.test.tsx`.

### 5. Implement corrections

- Fix claims at their source.
- Preserve correct examples and calculations.
- Label defaults as defaults.
- Label simulators as illustrative when they do not model an entire implementation.
- Avoid unrelated refactors and visual restyling.
- Do not add fallback text that hides an incorrect model.

### 6. Update tests

Tests should verify:

- Group anchors exist and appear in order.
- Every module anchor exists.
- Modules appear in intentional prerequisite order.
- Any new observable behavior has a deterministic behavior test.

### 7. Verify

Run the following from the repository root:

```bash
npm test
npm run typecheck
npm run build
npm run lint
```

Also perform a browser smoke check of `/networking` and verify:

- The page loads.
- All four groups render.
- The group order is correct.
- Sidebar links resolve.
- No visible module is missing or duplicated.

Report lint warnings separately from errors.

## Source register

Use primary sources first and add claim-specific sources as the audit progresses.

| Topic | Source |
|---|---|
| Private IPv4 address space | [RFC 1918](https://www.rfc-editor.org/rfc/rfc1918) |
| IPv4 point-to-point `/31` links | [RFC 3021](https://www.rfc-editor.org/rfc/rfc3021) |
| CIDR aggregation | [RFC 4632](https://www.rfc-editor.org/rfc/rfc4632) |
| IPv6 addressing architecture | [RFC 4291](https://www.rfc-editor.org/rfc/rfc4291) |
| IPv6 `/64` boundary guidance | [RFC 7421](https://www.rfc-editor.org/rfc/rfc7421) |
| IPv6 NAT/security considerations | [RFC 4864](https://www.rfc-editor.org/rfc/rfc4864) |
| Current VRRP Version 3 terminology and timers | [RFC 9568](https://www.rfc-editor.org/rfc/rfc9568) |
| VXLAN encapsulation and VNI | [RFC 7348](https://www.rfc-editor.org/rfc/rfc7348) |
| AWS subnet sizing and reserved addresses | [AWS subnet sizing](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html) |
| IEEE 802.1Q VLAN tagging overview | [Cisco 802.1Q tagging](https://www.cisco.com/c/en/us/support/docs/lan-switching/802-1q/10023-3.html) |
| WireGuard primitives and handshake | [WireGuard protocol](https://www.wireguard.com/protocol/) |
| Cloud provider behavior | Official AWS, Azure, and Google Cloud documentation for the specific claim |
| Wi-Fi behavior | Current IEEE or Wi-Fi Alliance documentation for the specific amendment and regulatory domain |

## Baseline review notes

The baseline review corrected or qualified claims related to:

- Cloud-provider subnet reservations.
- AWS-style security-group and network-ACL semantics.
- VXLAN encapsulation, UDP port usage, and VNI capacity.
- WireGuard and IPsec implementation descriptions.
- HSRP/VRRP role terminology and failover timers.
- Wi-Fi 7 320 MHz channel and throughput wording.
- VLAN/subnet mapping and broadcast-scope wording.
- IPv4, IPv6, NAT, routing, packet, and troubleshooting explanations.

A future session MUST verify these claims again against the current sources rather than assuming the baseline is still correct.

## Review record

- Baseline date: 2026-08-12
- Baseline page tests: 3 passed
- Baseline full tests: 54 passed across 13 files
- Baseline typecheck: passed
- Baseline production build: passed
- Baseline browser smoke check: passed
- Baseline lint: passed with warnings; no errors

## Final handoff response format

A completed review should report:

1. Files changed.
2. Modules reviewed and any new modules discovered.
3. Claims corrected, qualified, or left unresolved.
4. Sources consulted, with URLs.
5. Organization changes and prerequisite rationale.
6. Exact test, typecheck, build, lint, and browser results.
7. Remaining implementation-dependent claims or follow-up risks.
