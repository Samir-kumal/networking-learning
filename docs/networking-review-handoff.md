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
| IPv6 `/64` boundary analysis (informational) | [RFC 7421](https://www.rfc-editor.org/rfc/rfc7421) |
| IPv6 local-network protection and NAT rationale (informational) | [RFC 4864](https://www.rfc-editor.org/rfc/rfc4864) |
| Current VRRP Version 3 terminology and timers | [RFC 9568](https://www.rfc-editor.org/rfc/rfc9568) |
| VXLAN encapsulation and VNI | [RFC 7348](https://www.rfc-editor.org/rfc/rfc7348) |
| AWS subnet sizing and reserved addresses | [AWS subnet sizing](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html) |
| IEEE 802.1Q VLAN and bridging overview | [IEEE 802.1Q](https://www.ieee802.org/1/pages/802.1Q.html) |
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

## Claim audit matrix

This matrix is a tracking baseline, not proof that the current claims are still correct. `Baseline noted; recheck required` means the topic appeared in the baseline review notes but still needs a claim-level source check in the current repository.

| Item | Status | Claim areas to recheck | Primary source or action | Baseline action | Recheck |
|---|---|---|---|---|---|
| `basics` | Baseline noted; recheck required | Subnet boundaries, VLAN mapping, broadcast scope | RFC 1918; add VLAN-specific source | Qualified | Required |
| `binary` | Baseline noted; recheck required | IPv4 bits, private, loopback, and link-local semantics | RFC 1918; add RFC 3927 | Qualified | Required |
| `cidr` | Baseline noted; recheck required | Host formulas, directed broadcast, `/31`, and `/32` semantics | RFC 3021; RFC 4632 | Qualified | Required |
| `calculator` | Baseline noted; recheck required | Calculated network, host, and broadcast results | Local utility tests; recheck edge cases against RFC 3021 | Preserved | Required |
| `create` | Baseline noted; recheck required | Gateway conventions and local subnet configuration examples | RFC 1918; provider/vendor documentation | Qualified | Required |
| `vlsm` | Baseline noted; recheck required | Alignment, capacity, and non-overlapping allocations | RFC 4632; verify examples | Preserved | Required |
| `supernetting` | Baseline noted; recheck required | Contiguous blocks and CIDR aggregation | RFC 4632 | Qualified | Required |
| `vlans` | Baseline noted; recheck required | 802.1Q tagging and VLAN/subnet boundaries | IEEE 802.1Q; vendor-specific configuration docs | Qualified | Required |
| `dhcp` | Baseline noted; recheck required | DORA, relay behavior, options, and defaults | Add RFC 2131 and RFC 2132 | Qualified | Required |
| `ipv6` | Baseline noted; recheck required | Address architecture, `/64` convention, and NAT rationale | RFC 4291; RFC 7421; RFC 4864 | Qualified | Required |
| `ips` | Baseline noted; recheck required | Private/public ranges and NAT/PAT behavior | RFC 1918; add RFC 3022 and RFC 4787 | Qualified | Required |
| `cloud` | Baseline noted; recheck required | Provider reservations, scope, and security defaults | AWS, Azure, and Google Cloud docs for each claim | Qualified | Required |
| `wireless` | Baseline noted; recheck required | Wi-Fi 7 channel widths, RF behavior, and throughput | Current IEEE/Wi-Fi Alliance source per amendment and regulatory domain | Qualified | Required |
| `packets` | Baseline noted; recheck required | Header fields, MTU, encapsulation, and protocol examples | Add RFC 791, RFC 8200, and IEEE Ethernet source | Qualified | Required |
| `routing` | Baseline noted; recheck required | HSRP/VRRP roles, timers, and routing protocol behavior | RFC 9568; Cisco HSRP and protocol-specific sources | Qualified | Required |
| `firewall` | Baseline noted; recheck required | ACL direction, state, defaults, and logging | Vendor/provider documentation for each implementation | Qualified | Required |
| `security` | Baseline noted; recheck required | IPsec, WireGuard, VXLAN, and security-control semantics | RFC 7348; WireGuard protocol; add RFC 4301 | Qualified | Required |
| `diagnostics` | Baseline noted; recheck required | Command syntax, defaults, and simulated output | Platform manuals; label local simulator behavior | Qualified | Required |
| `troubleshooting` | Baseline noted; recheck required | Failure scenarios and diagnostic conclusions | Platform/vendor docs; separate local assumptions | Qualified | Required |
| `containers` | Baseline noted; recheck required | Kubernetes, CNI, Docker, and overlay behavior | Official Kubernetes/Docker/CNI docs; RFC 7348 | Qualified | Required |
| `practice` | Baseline noted; recheck required | Worked subnetting and VLSM answers | Source rows for IPv4/CIDR/VLSM; local tests | Preserved | Required |
| `cheatsheet` | Baseline noted; recheck required | Formula boundaries and special-prefix exceptions | Source rows for CIDR and `/31`; local tests | Qualified | Required |
| `quiz` | Baseline noted; recheck required | Answer keys and explanations match reviewed claims | Recheck against preceding module sources | Preserved | Required |

## Review record

### Historical baseline

- Baseline date: 2026-08-12
- Baseline page tests: 3 passed
- Baseline full tests: 54 passed across 13 files
- Baseline typecheck: passed
- Baseline production build: passed
- Baseline browser smoke check: passed
- Baseline lint: passed with warnings; no errors

### Pre-follow-up working-tree snapshot

Verification date: 2026-08-13. This snapshot superseded the historical baseline before the requested follow-up changes began.

- Scope: Current working tree before follow-up
- Networking page tests: 3 passed in 1 file
- Full tests: 55 passed in 13 files
- Typecheck: passed
- Production build: passed
- Browser/runtime smoke check: passed for `/networking`; the page loaded with four groups and 23 module anchors. The sidebar order/category mismatch was identified for follow-up.
- Lint: passed with no errors
- Lint warnings: 15 existing React hook dependency warnings

### Post-follow-up working-tree verification

Verification date: 2026-08-13. These results were collected after the follow-up curriculum, navigation, test, and handoff changes, before their final commit.

- Scope: After follow-up, before final commit
- Networking page tests: 5 passed in 1 file
- Full tests: 57 passed in 13 files
- Typecheck: passed
- Production build: passed; `/networking` and the other app routes generated successfully
- Browser/runtime smoke check: passed for `/networking`; heading, four groups, 23 unique module anchors, visible sidebar order/categories, and displayed module numbers matched the curriculum
- Lint: passed with no errors
- Lint warnings: 15 existing React hook dependency warnings

### Working-tree state

- Repository commit at verification time: `b6a4e25` (`Review networking curriculum content`)
- Staged files: 0
- Unstaged modified files: 20
- Untracked files: 0
- Modified paths: `docs/networking-review-handoff.md`, `src/app/networking/page.test.tsx`, `src/components/Sidebar.tsx`, and 17 networking section files (`CloudSubnetSection`, `ContainerSection`, `CreateSubnetSection`, `DhcpSection`, `DiagnosticsSection`, `FirewallSection`, `Ipv6Section`, `NatSection`, `PacketSection`, `RoutingSection`, `SecuritySection`, `SubnetCalculator`, `SupernetSection`, `TroubleshootingSection`, `VlanSection`, `VlsmSection`, and `WirelessSection`)
- Generated or ignored artifacts: Next.js build output under `.next/`

The review record MUST identify whether each result is historical baseline evidence or current working-tree evidence.

## Final handoff response format

A completed review should report:

1. Files changed.
2. Modules reviewed and any new modules discovered.
3. Claims corrected, qualified, or left unresolved.
4. Sources consulted, with URLs.
5. Organization changes and prerequisite rationale.
6. Exact test, typecheck, build, lint, and browser results.
7. Remaining implementation-dependent claims or follow-up risks.
8. Review status and whether results describe the baseline or current working tree.
9. Working-tree status, including commit, staged, unstaged, untracked, and generated/ignored files.
