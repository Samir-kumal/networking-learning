# Module Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every track and module sidebar link land on its requested module, and reset cross-track navigation to the top of the destination page.

**Architecture:** Keep the existing Sidebar IDs as the navigation contract. Add matching IDs at rendered module boundaries, use the shared client shell’s pathname transition to reset window scroll, and let GitOps translate hash targets into its existing tab state without changing simulator behavior.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest, React server-rendered markup, browser smoke tests.

## Global Constraints

- Preserve existing Networking and Cybersecurity IDs and same-route anchor behavior.
- Do not change ThemeToggle, global theme tokens, route data, simulator calculations, generated output, or accessibility labels.
- Do not add dependencies, formatters, linters, or project-wide validation inside implementation tasks.
- Use the Sidebar IDs exactly: `aws-vpc`, `aws-iam`, `aws-s3`, `aws-compute`, `aws-serverless`, `git-branching`, `git-actions`, `git-semver`, `git-deploy`, `k8s-dockerfile`, `k8s-compose`, `k8s-cluster`, `k8s-helm`, and `k8s-argocd`.
- Preserve modified-click Link behavior by only intercepting unmodified primary clicks in the track switcher.

---

### Task 1: Add failing rendered-anchor regression coverage

**Files:**
- Create: `src/components/tracks/ModuleNavigationAnchors.test.tsx`
- Read: `src/components/tracks/AwsSection.tsx`, `src/components/tracks/GitOpsSection.tsx`, `src/components/tracks/DockerK8sSection.tsx`

**Interfaces:**
- Consumes the existing default exports from the three track components.
- Produces a deterministic SSR regression test for the rendered navigation contract.

- [ ] **Step 1: Write the failing test**

Create a Vitest test using `renderToStaticMarkup` and assert that AWS renders all five expected IDs, GitOps renders its default `git-branching` panel ID, and Docker renders the five primary IDs. Example assertions:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AwsSection from "./AwsSection";
import DockerK8sSection from "./DockerK8sSection";
import GitOpsSection from "./GitOpsSection";

const ids = (html: string) => [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);

const expectIds = (html: string, expected: string[]) => {
  const rendered = ids(html);
  for (const id of expected) expect(rendered).toContain(id);
};

describe("module navigation anchors", () => {
  it("keeps AWS sidebar targets resolvable", () => {
    expectIds(renderToStaticMarkup(<AwsSection />), [
      "aws-vpc", "aws-iam", "aws-s3", "aws-compute", "aws-serverless",
    ]);
  });

  it("exposes the default GitOps tab target", () => {
    expectIds(renderToStaticMarkup(<GitOpsSection />), ["git-branching"]);
  });

  it("keeps Docker primary targets resolvable", () => {
    expectIds(renderToStaticMarkup(<DockerK8sSection />), [
      "k8s-dockerfile", "k8s-compose", "k8s-cluster", "k8s-helm", "k8s-argocd",
    ]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run `npm test -- src/components/tracks/ModuleNavigationAnchors.test.tsx` from the worktree. Expected: failure because AWS currently renders unprefixed IDs and Docker/GitOps primary targets are absent.

---

### Task 2: Reset scroll and initialize active sidebar item per track

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- Consumes `usePathname()` from `next/navigation` and the existing `navItems` list.
- Produces route transitions that start at `{ top: 0, left: 0 }` and an active sidebar item consistent with the current track.

- [ ] **Step 1: Add pathname-driven scroll reset**

In `AppShell.tsx`, import `useLayoutEffect` and `usePathname`. Read the pathname once inside `AppShell`, then add:

```tsx
const pathname = usePathname();

useLayoutEffect(() => {
  if (!window.location.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
}, [pathname]);
```

Keep the existing shell markup and collapse state unchanged. This must only run when the route path changes and must not override a destination hash; native hash scrolling remains responsible for cross-route targets, while GitOps scrolls its selected panel after activating it. In the Sidebar track switcher, prevent the default link action, reset with the same instant scroll call, then call `router.push(track.path)` so the transition starts from zero even with global smooth scrolling enabled.

- [ ] **Step 2: Remove the Networking-only active fallback**

In `Sidebar.tsx`, initialize the active ID to `navItems[0]?.id ?? ""` inside the existing IntersectionObserver effect. Read the current hash on effect setup and on `hashchange`; when it matches a current `navItems` ID, set that ID active before the observer updates continue. This keeps direct GitOps hash navigation visually aligned with the selected tab.


- [ ] **Step 3: Run the focused anchor test**

Run `npm test -- src/components/tracks/ModuleNavigationAnchors.test.tsx`. It may still fail on component IDs; record that failure before Task 3 and do not run project-wide validation here.

---

### Task 3: Align AWS and Docker module targets

**Files:**
- Modify: `src/components/tracks/AwsSection.tsx:412,661,825,1003,1174`
- Modify: `src/components/tracks/DockerK8sSection.tsx:667,918,1107,1305`

**Interfaces:**
- Consumes existing module section/column markup.
- Produces the exact IDs used by `MODULE_ITEMS_BY_TRACK` and HubHero links.

- [ ] **Step 1: Rename AWS root IDs without changing section content**

Change only the five section IDs:

```tsx
id="vpc"     -> id="aws-vpc"
id="iam"     -> id="aws-iam"
id="s3"      -> id="aws-s3"
id="compute" -> id="aws-compute"
id="lambda"  -> id="aws-serverless"
```

Update adjacent comments only if needed to keep anchor documentation accurate. Do not alter controls, state, formulas, or child IDs.

- [ ] **Step 2: Add Docker primary module IDs**

Add IDs to the existing primary sections:

```tsx
<section id="k8s-dockerfile" ...>
<section id="k8s-compose" ...>
<section id="k8s-cluster" ...>
```

Inside the combined Module 4 grid, add `id="k8s-helm"` to the existing Helm left-column wrapper and `id="k8s-argocd"` to the existing ArgoCD right-column wrapper. Do not introduce additional wrappers or change layout classes.

- [ ] **Step 3: Run the focused anchor test and verify it passes**

Run `npm test -- src/components/tracks/ModuleNavigationAnchors.test.tsx`. Expected: AWS and Docker assertions pass; GitOps non-default behavior remains for Task 4.

---

### Task 4: Make GitOps hash targets select tabs

**Files:**
- Modify: `src/components/tracks/GitOpsSection.tsx:46-48,717,1004,1218,1373`

**Interfaces:**
- Consumes the existing `activeTab` state and browser `location.hash`.
- Produces hash-to-tab selection for `git-branching`, `git-actions`, `git-semver`, and `git-deploy`, with each active panel carrying the corresponding ID.

- [ ] **Step 1: Add the hash-to-tab map and listener**

Define a local constant near the tab state:

```tsx
const TAB_BY_HASH = {
  "git-branching": "git",
  "git-actions": "actions",
  "git-semver": "semver",
  "git-deploy": "deploy",
} as const;
```

Add a `useEffect` that reads `window.location.hash.slice(1)` on mount, selects `TAB_BY_HASH[hash]` when present, subscribes to `hashchange`, and removes the listener on cleanup. Keep the existing `setActiveTab` handlers and tab labels unchanged.

- [ ] **Step 2: Add IDs to the four conditional panel roots**

Set the root `div` of each conditional panel to the matching ID:

```tsx
activeTab === "git"     -> id="git-branching"
activeTab === "actions" -> id="git-actions"
activeTab === "semver"  -> id="git-semver"
activeTab === "deploy"  -> id="git-deploy"
```

Use the existing root className strings unchanged except for the `id` attribute.

- [ ] **Step 3: Run focused regression coverage**

Run `npm test -- src/components/tracks/ModuleNavigationAnchors.test.tsx`. Expected: all assertions pass. Do not run formatters, linters, or the full suite in this task.

---

### Task 5: Validate navigation end to end

**Files:**
- Read: `src/components/Sidebar.tsx`, `src/components/AppShell.tsx`, and all changed track components/tests.

- [ ] **Step 1: Run the complete test suite**

Run `npm test`. Expected: all existing and navigation tests pass with zero failures.

- [ ] **Step 2: Build production output**

Run `npm run build`. Expected: Next.js production build completes successfully.

- [ ] **Step 3: Browser-smoke cross-track scroll reset**

Start the app on an available port, open Networking, scroll to the bottom, click the visible Docker & K8s track link, and assert `location.pathname === "/docker-k8s"`, `window.scrollY === 0`, and the `k8s-dockerfile` target is at/near the viewport top. Repeat from a lower-scroll AWS or Security page into another track.

- [ ] **Step 4: Browser-smoke target coverage**

On AWS, click each sidebar module and assert its hash target exists. On GitOps, navigate to `#git-actions`, `#git-semver`, and `#git-deploy`, then assert the corresponding panel is rendered and visible. On Docker, verify D1, D2, D3, D4, D5, and representative existing D6/D15 targets.

- [ ] **Step 5: Review scope and output**

Confirm the diff contains only the approved scroll, active-item, anchor, hash-tab, test, and planning/spec changes. Confirm no simulator output, state transitions, theme behavior, or accessibility labels changed.
