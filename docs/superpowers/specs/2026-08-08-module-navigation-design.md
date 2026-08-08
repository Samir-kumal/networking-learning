# Module Navigation Reliability Design

**Date:** 2026-08-08
**Status:** Approved

## Goal

Make track and module navigation land on the requested first/target module across Networking, AWS, Cybersecurity, GitOps, and Docker & Kubernetes.

## Root causes

1. Cross-track Next.js navigation preserves the previous document scroll offset while the new client-rendered page grows, so a route can open around a later module.
2. AWS sidebar IDs (`aws-vpc`, `aws-iam`, `aws-s3`, `aws-compute`, `aws-serverless`) do not match the rendered IDs (`vpc`, `iam`, `s3`, `compute`, `lambda`).
3. GitOps tab content has no matching hash targets and hash navigation cannot select a non-default tab.
4. Docker modules D1–D5 have no matching target IDs; D6–D15 already expose targets.

## Design

- Reset `window.scrollTo({ top: 0, left: 0, behavior: "instant" })` from the shared client shell whenever `usePathname()` changes and the destination has no hash. Track-switch clicks reset before `router.push`; cross-route hash links retain native hash scrolling, and GitOps hash links activate their panel and scroll it after render.
- Keep the sidebar’s existing public module IDs and add/rename rendered targets to match them exactly.
- Add `id="k8s-dockerfile"`, `id="k8s-compose"`, and `id="k8s-cluster"` to Docker’s first three module sections. Split the combined Helm/Argo module with `id="k8s-helm"` on the Helm column and `id="k8s-argocd"` on the ArgoCD column.
- Add IDs to the four GitOps tab panels and map hashes to tab state on mount and `hashchange`; do not change simulator calculations, generated output, or existing tab controls.
- Initialize the sidebar active item from the current track’s first item, then synchronize it with a matching URL hash while retaining IntersectionObserver updates.

## Constraints

- No changes to `ThemeToggle`, global theme tokens, route data, simulator state, generated output, or accessibility labels.
- Preserve existing Networking and Cybersecurity anchor IDs.
- Use existing Tailwind classes and component patterns; no new dependency.
- Preserve modified-click Link behavior (new tab/window and alternate-button activation) by only intercepting unmodified primary clicks.

## Acceptance criteria

- Switching tracks from any scroll position opens the destination at scroll position zero.
- Every sidebar module hash resolves to an element on its destination route.
- GitOps hashes select and reveal the requested tab panel.
- Existing tests pass, the production build succeeds, and browser smoke tests cover cross-track reset plus representative AWS, GitOps, and Docker targets.
