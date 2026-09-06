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
| IPv4 broadcast addressing | [RFC 919](https://www.rfc-editor.org/rfc/rfc919) |
| Router requirements, directed broadcast, and ICMP rate limiting | [RFC 1812](https://www.rfc-editor.org/rfc/rfc1812) |
| Host requirements, limited broadcast, and off-link forwarding | [RFC 1122](https://www.rfc-editor.org/rfc/rfc1122) |
| Proxy ARP | [RFC 1027](https://www.rfc-editor.org/rfc/rfc1027) |
| DHCP protocol, states, and T1/T2 defaults | [RFC 2131](https://www.rfc-editor.org/rfc/rfc2131) |
| DHCP option codes | [RFC 2132](https://www.rfc-editor.org/rfc/rfc2132) |
| Traditional NAT and NAPT | [RFC 3022](https://www.rfc-editor.org/rfc/rfc3022) |
| NAT mapping and filtering behavior requirements | [RFC 4787](https://www.rfc-editor.org/rfc/rfc4787) |
| IPv4 link-local addressing (APIPA) | [RFC 3927](https://www.rfc-editor.org/rfc/rfc3927) |
| IPv6 documentation prefix `2001:db8::/32` | [RFC 3849](https://www.rfc-editor.org/rfc/rfc3849) |
| Reserved IPv6 interface identifiers | [RFC 5453](https://www.rfc-editor.org/rfc/rfc5453) |
| IPv6 node requirements (IPsec is a SHOULD) | [RFC 8504](https://www.rfc-editor.org/rfc/rfc8504) |
| TCP header, reserved bits, and control flags | [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293) |
| ECN experimentation; NS bit reclassified Historic | [RFC 8311](https://www.rfc-editor.org/rfc/rfc8311) |
| OSPF cost and administrator-assigned metrics | [RFC 2328](https://www.rfc-editor.org/rfc/rfc2328) |
| IPsec architecture and NAT traversal | [RFC 4301](https://www.rfc-editor.org/rfc/rfc4301); [RFC 3948](https://www.rfc-editor.org/rfc/rfc3948) |
| Cisco administrative distance defaults | [Cisco AD reference](https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/15986-admin-distance.html) |
| Cisco extended ACL behavior and implicit deny | [Cisco ACL guide](https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html) |
| AWS network ACL and security-group semantics | [AWS network ACLs](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html); [AWS security groups](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html) |
| Azure subnet reservations | [Azure VNet FAQ](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq) |
| Google Cloud subnet reservations (primary vs secondary ranges) | [Google Cloud subnets](https://cloud.google.com/vpc/docs/subnets) |
| Azure Terraform resource requirements | [azurerm_subnet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) |
| 6 GHz unlicensed operation | [FCC 6 GHz order](https://www.fcc.gov/document/fcc-opens-6-ghz-band-wi-fi-and-other-unlicensed-uses-0) |
| Flannel VXLAN backend port defaults | [Flannel backends](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md) |
| Docker overlay networks and Swarm address pool | [Docker overlay driver](https://docs.docker.com/engine/network/drivers/overlay/) |
| kube-proxy modes | [Kubernetes virtual IPs](https://kubernetes.io/docs/reference/networking/virtual-ips/) |
| Cilium kube-proxy replacement datapath | [Cilium kube-proxy free](https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/) |
| nmap port specification | [Nmap `-p`](https://nmap.org/book/man-port-specification.html) |

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

This matrix is a tracking record, not proof that the current claims are still correct. `Rechecked 2026-09-06` means every module in that row was read in full and its significant claims were checked against the listed sources during the 2026-09-06 pass.

| Item | Status | Claim areas rechecked | Primary source or action | 2026-09-06 action | Recheck |
|---|---|---|---|---|---|
| `basics` | Rechecked 2026-09-06 | Subnet boundaries, VLAN mapping, broadcast scope | RFC 1918; IEEE 802.1Q | None needed; math and hedging verified | On content change |
| `binary` | Rechecked 2026-09-06 | IPv4 bits, private, loopback, and link-local semantics | RFC 1918; RFC 3927; RFC 4632 | Corrected stale CIDR citation (RFC 1519 → obsoleted by RFC 4632) | On content change |
| `cidr` | Rechecked 2026-09-06 | Host formulas, directed broadcast, `/0`, `/31`, `/32` semantics | RFC 3021; RFC 4632 | `/0` now presented as the default route instead of host capacity | On content change |
| `calculator` | Rechecked 2026-09-06 | Calculated network, host, and broadcast results | `subnet-utils` tests; RFC 3021 | None needed; `/20`, `/30`, `/31`, `/32`, and invalid input verified in-browser | On content change |
| `create` | Rechecked 2026-09-06 | Gateway conventions and local subnet configuration examples | RFC 1918; vendor documentation | None needed; Cisco/netsh/iproute2 syntax verified | On content change |
| `vlsm` | Rechecked 2026-09-06 | Alignment, capacity, and non-overlapping allocations | RFC 4632 | None needed; every block re-derived | On content change |
| `supernetting` | Rechecked 2026-09-06 | Contiguous blocks, CIDR aggregation, common-bit highlighting | RFC 4632 | Fixed binary highlighter: 22 common bits span 24 characters, not 26 | On content change |
| `vlans` | Rechecked 2026-09-06 | 802.1Q tagging, access vs trunk ports, VLAN/subnet boundaries | IEEE 802.1Q; Cisco VLAN configuration guide | "native VLAN" → "access VLAN (PVID)"; native/untagged trunk exception added | On content change |
| `dhcp` | Rechecked 2026-09-06 | DORA, relay behavior, options, defaults, IPAM model | RFC 2131; RFC 2132; RFC 1122; RFC 3927 | Header anchor label fixed; dead lease-duration state removed and the exhaustion model labelled illustrative; Option 3 MUST → SHOULD; APIPA and limited-broadcast wording requalified | On content change |
| `ipv6` | Rechecked 2026-09-06 | Address architecture, `/64` convention, documentation prefix, IPsec status | RFC 4291; RFC 5453; RFC 7421; RFC 8504; RFC 3849 | Documentation-prefix label corrected to `2001:db8::/32`; `/64` boundary and IPsec status requalified | On content change |
| `ips` | Rechecked 2026-09-06 | Private/public ranges and NAT/PAT behavior | RFC 1918; RFC 3022; RFC 4787 | "Non-Routable on Internet" → "Not globally routed"; NAPT/endpoint-independent mapping noted; all three RFC 1918 blocks listed | On content change |
| `cloud` | Rechecked 2026-09-06 | Provider reservations, subnet scope, Terraform example | AWS, Azure, and Google Cloud docs | AZ claim widened to Local Zone/Outpost; GCP reservation scoped to the primary range; Azure Terraform snippet made applicable | On content change |
| `wireless` | Rechecked 2026-09-06 | Channel plans, 6 GHz numbering, bonding overlap, RF math | FCC 6 GHz order; IEEE/Wi-Fi Alliance; Cisco P2P block | 6 GHz channel list separated from 5 GHz; overlap check made bonding-width aware; non-overlapping zones fixed (`width-[20%]` → `w-[20%]`); spectrum axis labelled ordinal; client-isolation and guest-ACL wording corrected | On content change |
| `packets` | Rechecked 2026-09-06 | Header fields, sample-packet buffers, offsets, TTL behavior | RFC 791; RFC 9293; RFC 8311; RFC 1812 | TCP field relabelled 4b reserved + 8b flags; all six sample packets made byte-consistent (`length` = rawHex bytes = IPv4 Total Length + 14, data offset matches real TCP header); TTL/ICMP wording requalified | On content change |
| `routing` | Rechecked 2026-09-06 | HSRP/VRRP roles and timers, protocol metrics, administrative distance | RFC 9568; RFC 2328; Cisco AD and FHRP docs | AD table and OSPF cost labelled Cisco IOS defaults; EIGRP 90/BGP 20 scoped; HSRP vMAC marked v1 and timers marked defaults | On content change |
| `firewall` | Rechecked 2026-09-06 | ACL direction, state, defaults, and logging | Cisco ACL configuration guide | Implicit `deny ip any any` consequence documented | On content change |
| `security` | Rechecked 2026-09-06 | IPsec, WireGuard, VXLAN, NACL/SG semantics, CIDR matching | RFC 7348; RFC 4301; RFC 3948; WireGuard protocol; AWS NACL/SG docs | CIDR matcher replaced with generic prefix math in `src/lib/ip-match.ts`; NACL catch-all rendered as the un-numbered `*` rule | On content change |
| `diagnostics` | Rechecked 2026-09-06 | Command syntax, defaults, simulated output | Platform manuals; nmap port-spec docs | Simulated `nmap` now honours `-p`; `ping -t` marked platform-specific; ping failure output made consistently Linux | On content change |
| `troubleshooting` | Rechecked 2026-09-06 | Failure scenarios and diagnostic conclusions | RFC 919; RFC 1812; IEEE 802.1Q | `.0`/`.255` symptom corrected (no broadcast-storm claim); wrong-access-VLAN symptom corrected (wrong broadcast domain, not dropped frames) | On content change |
| `containers` | Rechecked 2026-09-06 | Kubernetes, CNI, Docker, and overlay behavior | Kubernetes, Docker, Flannel, and Cilium docs | Flannel VXLAN port corrected to 8472 (4789 on Windows); Swarm pool corrected to `10.0.0.0/8`; TLS-termination and Cilium datapath wording fixed; "legacy iptables" and "live" simulator labels requalified | On content change |
| `practice` | Rechecked 2026-09-06 | Worked subnetting and VLSM answers | RFC 4632; RFC 1122; RFC 1027 | All five problems re-derived and left intact; VLSM "mandates" and the L2/broadcast-domain conflation reworded | On content change |
| `cheatsheet` | Rechecked 2026-09-06 | Formula boundaries, prefix table, special-prefix exceptions | RFC 3021; RFC 4632; RFC 919 | `/8` block size corrected to `1 (Octet 1) / 256 (Octet 2)`; interesting-octet convention made consistent with the mnemonic; mnemonic extended to `/32`; `/32` mask parenthetical clarified; dead `octet4` filter removed | On content change |
| `quiz` | Rechecked 2026-09-06 | Answer keys and explanations match reviewed claims | Preceding module sources | All eight keys re-derived and unchanged; Q4 explanation reworded to alignment/fragmentation | On content change |

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

### 2026-09-06 audit and fix pass

Verification date: 2026-09-06. Current working tree, after the fixes, before commit. All 23 modules plus `src/lib/subnet-utils.ts` and `src/lib/diagnostics-parser.ts` were read in full; the audit ran read-only first and fixes were applied only after explicit authorization.

- Scope: Current working tree after the 2026-09-06 fixes
- Networking page tests: 7 passed in 1 file
- Full tests: 100 passed in 20 files (was 92 in 19; `src/lib/ip-match.test.ts` adds 8)
- Typecheck: passed
- Production build: passed; `/networking` prerendered as static content
- Lint: passed with 0 errors and 0 warnings (the 15 React hook dependency warnings recorded above were resolved in commit `c4ccf91`)
- Browser/runtime smoke check: passed for `/networking`. Heading `Read the path a packet takes.`, four group anchors in order, 23 `data-networking-header` elements, 23 `.networking-module` roots, all 23 sidebar anchors present exactly once, and no console errors or page errors.
- Interactive verification: subnet calculator re-checked for `/20`, `/30`, `/31` (RFC 3021 endpoints, no broadcast), `/32` (host route), and invalid input; the NACL inspector now matches a user-entered `10.0.1.16/28` rule and returns `DENY` for `10.0.1.25` (before the fix every non-`/8`, `/16`, `/24`, `/32` prefix silently failed to match and the packet was reported allowed); the wireless planner shows 6 GHz channels `1, 5, 9, …` at `5955 MHz` with no DFS marking and reports `Overlapping at 80 MHz (gap 4, needs 16)`; the non-overlapping 1/6/11 zones now render at 20% width instead of zero.
- Source-level invariant check: all six `SAMPLE_PACKETS` entries satisfy `length` = `rawHex` byte count = IPv4 Total Length + 14 (`74/74/66/162/75/68` and `60/60/52/148/61/54`).

#### Working-tree state at 2026-09-06

- Repository commit at verification time: `33a7ea3` (`fix(docker): bump production image to Node 22, fixing better-sqlite3 segfault`)
- Staged files: 0
- Unstaged modified files: 20 networking section files plus `package-lock.json` (pre-existing, unrelated)
- Untracked files: 2 (`src/lib/ip-match.ts`, `src/lib/ip-match.test.ts`)
- Unchanged by this pass: `src/app/networking/page.tsx`, `src/app/networking/page.test.tsx`, `src/components/Sidebar.tsx`, `src/lib/subnet-utils.ts` — the curriculum inventory, order, and shared subnet math needed no change
- Generated or ignored artifacts: Next.js build output under `.next/`

#### Follow-up risks

- `RoutingSection.tsx` keeps its local `ipToLong`/`parseCidr` helpers because the longest-prefix-match sort needs the prefix length, network, and broadcast values that `ipInCidr` does not return. Two IPv4 parsers therefore coexist: `src/lib/ip-match.ts` (membership) and the local parser (route lookup).
- The DHCP pool-exhaustion metric is a worst-case bound that does not model lease release; it is now labelled illustrative with its formula shown.
- The wireless spectrum chart places APs by channel index, not frequency, and the axis says so.
- The 6 GHz channel list is a representative U-NII-5 subset (`1`-`93`) of the full `1`-`233` numbering.
- Throughput, RF, and container-performance figures remain illustrative and hardware/regulatory dependent.


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
