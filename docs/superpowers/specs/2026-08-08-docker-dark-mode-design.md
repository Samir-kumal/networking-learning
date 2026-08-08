# Docker & Kubernetes Dark-Mode Parity

## Context

The application theme toggle already applies the `dark` class to the document root, and the Networking track responds correctly through explicit Tailwind `dark:` variants. The Docker & Kubernetes track still uses mostly light-only classes, so its cards, nested panels, controls, text, borders, and code viewers remain bright while the shell is dark.

## Goal

Bring all 15 Docker & Kubernetes modules to the same light/dark behavior and visual hierarchy as the Networking modules without changing component behavior, state transitions, or theme persistence.

## Scope

Update the Docker track sources:

- `src/app/globals.css`
- `src/components/tracks/DockerK8sSection.tsx`
- `src/components/tracks/DkSecurityScanSection.tsx`
- `src/components/tracks/DkResourceQuotasSection.tsx`
- `src/components/tracks/DkNetworkPolicySection.tsx`
- `src/components/tracks/DkIngressServiceMeshSection.tsx`
- `src/components/tracks/DkPersistentVolumesSection.tsx`
- `src/components/tracks/DkImageRegistrySection.tsx`
- `src/components/tracks/DkRbacSecuritySection.tsx`
- `src/components/tracks/DkHpaVpaSection.tsx`
- `src/components/tracks/DkTroubleshootingSection.tsx`
- `src/components/tracks/DkObservabilitySection.tsx`

Configure Tailwind's `dark:` variant to follow the application's `.dark` root class so the existing theme toggle controls both the global tokens and utility classes.

Do not change `ThemeToggle`, global theme tokens, routing, module data, or interactive logic. The only global CSS change is the `dark:` variant selector needed to make the existing root-class theme contract effective.

## Design

Use the existing Networking implementation as the styling contract. Configure Tailwind's `dark:` variant to use the document `.dark` class, then add explicit `dark:` variants alongside existing light classes rather than introducing a global descendant override or a second theme abstraction.

### Surface hierarchy

- Primary module cards: `bg-white dark:bg-slate-800`.
- Nested cards and controls: retain the light surface hierarchy while using `dark:bg-slate-700` or a matching translucent slate variant.
- Existing intentionally dark terminal, log, and console surfaces remain dark in both themes.
- Preserve accent gradients and colored hero banners; add dark-safe borders and surrounding surfaces where needed.

### Content hierarchy

- Primary headings and values: `text-slate-900 dark:text-slate-100`.
- Supporting copy and labels: `text-slate-500 dark:text-slate-400`.
- Secondary values and muted metadata: `text-slate-600 dark:text-slate-300` or `text-slate-500` according to contrast needs.
- Keep semantic accent colors, adding dark-readable accent variants for chips, statuses, and selected states.

### Controls and code panels

- Inputs, selects, and textareas receive dark backgrounds, borders, text, placeholder colors, and preserved focus rings.
- Unselected and disabled buttons gain dark surface/text/border variants while selected states retain their existing accent treatment.
- Code viewers and generated YAML/Dockerfile panels remain readable in both themes, with dark backgrounds where the panel is a code surface and dark-aware headers/borders around it.
- Existing local Observability light/dark simulator state remains independent from the document theme; global theme variants apply only to its surrounding application surfaces.

## Non-goals

- No redesign of the Docker modules.
- No color-token refactor across the rest of the application.
- No changes to calculations, simulations, generated output, copy actions, or accessibility labels.
- No forced theme preference or change to hydration behavior.

## Verification

1. Run the existing Vitest suite.
2. Run the production build.
3. In a browser, inspect the Docker page in light mode and dark mode at the first modules, middle modules, and final Observability module.
4. Confirm representative primary cards, nested panels, form controls, selected/unselected states, code viewers, terminal panels, and muted text maintain readable contrast in both themes.
5. Confirm the document theme toggle/persistence behavior remains unchanged and no console errors appear during the Docker page interaction smoke test.
