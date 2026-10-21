# Foliojoy — light "paper" theme, real typography, allocation ribbon

## Context

The Foliojoy web app currently renders every screen in the OS default font (no webfont is loaded at all — `document.fonts` is empty and `index.html` has no font link), paints itself near-black `#090d15` with acid lime `#c9e98e` on every surface, draws the same allocation data four times (ECharts donut + legend grid + exposure meter list + holdings table), binds legend/meter colors by `dot-${i % 5}` against a separate 7-color ECharts array (so the 6th holding reuses the 1st holding's color and legend swatches disagree with donut arcs), truncates market value off-screen on a 390px viewport, animates currency figures with `CountUp`, and puts `--text-muted #64748b` (4.09:1) on 11px labels.

End state: a full light "paper" theme (ink on warm neutral, deep-green brand) with self-hosted Geist + Geist Mono, one canonical allocation ribbon that replaces donut/legend/meters, one palette bound by holding, AA-compliant label contrast, a mobile-correct holdings list, and motion confined to the signature ribbon sweep. Scope is core + mobile + a11y + motion cleanup; the import flow's explicit "Validate" step is unchanged, and the backend is untouched (no API, schema or migration changes).

## Approach

Steps are ordered; each leaves the app building and the backend untouched. Backend API, `api.ts` types and `Position` shape are unchanged throughout.

### Step 1 — Typography foundation

**1.1 Dependencies** — in `frontend/package.json` `dependencies`, add:

```
"@fontsource-variable/geist": "^5.3.0",
"@fontsource-variable/geist-mono": "^5.3.0",
```

and remove `"echarts": "^5.5.1"` and `"echarts-for-react": "^3.0.2"` (ECharts has exactly one consumer, removed in step 4 — confirm with `grep -rn "echarts" frontend/src`, which must return only `frontend/src/components/DashboardView.tsx` before deleting the deps). Run `npm install` in `frontend/` so `package-lock.json` is regenerated — CI and `frontend/Dockerfile` use `npm ci`, so the lockfile must be committed in sync.

**1.2 Font loading** — in `frontend/src/main.tsx`, add the two imports *before* the existing `import './styles.css'` (line 5), so the font faces are registered before the token block is parsed:

```ts
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
```

These packages register the families `Geist Variable` and `Geist Mono Variable` and self-host the woff2 files (no runtime CDN request, works in the nginx Docker build).

**1.3 Tokens** — in `frontend/src/styles.css` `:root` (lines 48-59), replace the two font tokens with:

```css
  --font-sans: 'Geist Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Geist Mono Variable', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

**1.4 The data voice** — in `frontend/src/styles.css`, the existing rule at line 145 is exactly:

```css
.tabular-numbers {
  font-variant-numeric: tabular-nums;
}
```

Change it to:

```css
.tabular-numbers {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
```

This single edit moves every existing numeric cell (table cells, stat values, percentages) into the mono face without touching call sites. Add one new utility rule next to it:

```css
.figure-hero {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 3rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: var(--text-primary);
  margin: 18px 0 8px;
}
```

and one accessibility utility (no such class exists today):

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Step 2 — Token block replacement (the whole theme)

Replace the `:root` block at `frontend/src/styles.css:7-69` with the following. Every value is fixed here; do not re-derive or "improve" them. All contrast pairs below were computed against the stated background: `--text-muted #5F6672` = 5.78:1 on `#FFFFFF` and 5.08:1 on `#F2F0EA`; `--text-secondary #4A5058` = 8.14:1 / 7.14:1; `--text-primary #14161A` = 18.11:1 / 15.89:1; white on `--accent-brand #1F4E3D` = 9.48:1; `--status-danger #C92A2A` = 5.46:1; `--status-success #237A34` = 5.38:1; `--status-warning #A15C07` = 5.19:1 on white and 4.90:1 on `--status-warning-bg #FFF9DB`.

```css
:root {
  /* Surfaces & Backgrounds */
  --bg-canvas: #F2F0EA;
  --bg-subtle: #ECEAE2;
  --bg-surface: #FFFFFF;
  --bg-surface-elevated: #FAF9F5;
  --bg-surface-hover: #F0EEE6;
  --bg-surface-active: #E7E4DA;

  /* Borders */
  --border-subtle: #E3E0D6;
  --border-default: #D6D2C6;
  --border-hover: #B9B4A5;
  --border-control: #8A8578;   /* interactive field boundaries, 3.68:1 on white */
  --border-focus: #1F4E3D;

  /* Text & Foreground */
  --text-primary: #14161A;
  --text-secondary: #4A5058;
  --text-muted: #5F6672;

  /* Brand — Foliojoy deep green */
  --accent-brand: #1F4E3D;
  --accent-brand-hover: #17392C;
  --accent-brand-active: #102A20;
  --accent-brand-text: #FFFFFF;
  --accent-brand-subtle: rgba(31, 78, 61, 0.07);
  --accent-brand-glow: rgba(31, 78, 61, 0.14);

  /* Status Colors */
  --status-danger: #C92A2A;
  --status-danger-bg: #FFF5F5;
  --status-danger-border: #FFC9C9;
  --status-danger-text: #9B1C1C;
  --status-success: #237A34;
  --status-success-bg: #EBFBEE;
  --status-success-border: #B2F2BB;
  --status-success-text: #1B6E2A;
  --status-warning: #A15C07;
  --status-warning-bg: #FFF9DB;
  --status-warning-border: #FFE8A3;

  /* Typography */
  --font-sans: 'Geist Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Geist Mono Variable', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* Border Radii */
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 22px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(20, 22, 26, 0.05);
  --shadow-md: 0 4px 12px rgba(20, 22, 26, 0.07);
  --shadow-lg: 0 12px 32px rgba(20, 22, 26, 0.09);
  --shadow-popover: 0 16px 40px -8px rgba(20, 22, 26, 0.16), 0 0 0 1px rgba(20, 22, 26, 0.06);
  --shadow-dialog: 0 24px 60px -12px rgba(20, 22, 26, 0.20), 0 0 0 1px rgba(20, 22, 26, 0.06);

  /* Transitions */
  --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-normal: 220ms;

  font-family: var(--font-sans);
  color: var(--text-primary);
  background-color: var(--bg-canvas);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

`--accent-lime*` and `--text-faint` are removed with this block; every consumer of them is remapped in step 2.1.

**2.1 Hardcoded-color remap** — the theme is only complete when no dark literal survives. Apply exactly these substitutions:

`frontend/src/styles.css`:

| Line | Old | New |
|---|---|---|
| 198 | `border-color: rgba(255, 255, 255, 0.15)` | `border-color: rgba(20, 22, 26, 0.08)` |
| 199 | `box-shadow: 0 2px 8px rgba(201, 233, 142, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)` | `box-shadow: 0 2px 8px rgba(31, 78, 61, 0.20)` |
| 204 | `box-shadow: 0 4px 14px rgba(201, 233, 142, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.4)` | `box-shadow: 0 4px 14px rgba(31, 78, 61, 0.24)` |
| 221 | `color: #fff` (`.button.secondary:hover`) | `color: var(--text-primary)` |
| 242 | `background-color: #381922` (`.button.danger:hover`) | `background-color: var(--status-danger-bg)` |
| 243 | `border-color: #75293a` | `border-color: var(--status-danger-border)` |
| 406 | `var(--spotlight-color, rgba(201, 233, 142, 0.08))` | `var(--spotlight-color, rgba(20, 22, 26, 0.05))` |
| 498 | `linear-gradient(135deg, var(--accent-lime) 0%, #b8e072 100%)` | `linear-gradient(135deg, var(--accent-brand) 0%, #2A6B53 100%)` |
| 499 | `color: var(--accent-lime-text)` | `color: var(--accent-brand-text)` |
| 560 | `background-color: rgba(201, 233, 142, 0.1)` (`.nav-item.active`) | `background-color: var(--accent-brand-subtle)` |
| 561 | `color: var(--accent-lime)` | `color: var(--accent-brand)` |
| 562 | `border: 1px solid rgba(201, 233, 142, 0.2)` | `border: 1px solid rgba(31, 78, 61, 0.14)` |
| 606 | `background-color: rgba(13, 19, 31, 0.85)` (topbar) | `background-color: rgba(242, 240, 234, 0.88)` |
| 623 | `linear-gradient(135deg, #1e2e40 0%, #172433 100%)` (avatar) | `linear-gradient(135deg, #2C3540 0%, #1D242C 100%)` |
| 625 | `color: var(--accent-lime)` (avatar) | `color: #FFFFFF` |
| 808 | `background-color: rgba(201, 233, 142, 0.08)` (popover create action) | `background-color: var(--accent-brand-subtle)` |
| 819 | `background-color: rgba(6, 10, 18, 0.78)` (dialog overlay) | `background-color: rgba(20, 22, 26, 0.42)` |
| 874 | `background-color: rgba(201, 233, 142, 0.1)` (empty-state icon tile) | `background-color: var(--accent-brand-subtle)` |
| 875 | `border: 1px solid rgba(201, 233, 142, 0.2)` | `border: 1px solid rgba(31, 78, 61, 0.14)` |
| 876 | `color: var(--accent-lime)` | `color: var(--accent-brand)` |
| 941 | `linear-gradient(135deg, rgba(201, 233, 142, 0.12) 0%, rgba(18, 25, 39, 0.8) 100%)` | `linear-gradient(135deg, rgba(31, 78, 61, 0.06) 0%, #FFFFFF 100%)` |
| 942 | `border: 1px solid rgba(201, 233, 142, 0.25)` | `border: 1px solid var(--border-default)` |
| 943 | `color: var(--accent-lime)` | `color: var(--accent-brand)` |
| 947 | `box-shadow: 0 4px 20px rgba(201, 233, 142, 0.12)` | `box-shadow: var(--shadow-sm)` |
| 983 | `background-color: rgba(13, 19, 31, 0.5)` (onboarding step area) | `background-color: rgba(250, 249, 245, 0.6)` |
| 999 | `border-color: rgba(201, 233, 142, 0.3)` | `border-color: rgba(31, 78, 61, 0.28)` |
| 1000 | `background-color: rgba(201, 233, 142, 0.04)` | `background-color: rgba(31, 78, 61, 0.05)` |
| 1017 | `background-color: rgba(74, 222, 128, 0.15)` (completed step pill) | `background-color: rgba(35, 122, 52, 0.12)` |
| 1058 | `border-color: var(--accent-lime)` (dropzone idle) | `border-color: var(--accent-brand)` |
| 1059 | `background-color: rgba(201, 233, 142, 0.02)` | `background-color: rgba(31, 78, 61, 0.02)` |
| 1063 | `border-color: var(--accent-lime)` (dropzone drag-active) | `border-color: var(--accent-brand)` |
| 1064 | `background-color: rgba(201, 233, 142, 0.06)` | `background-color: rgba(31, 78, 61, 0.05)` |
| 1065 | `box-shadow: 0 0 24px var(--accent-lime-subtle)` | `box-shadow: 0 0 24px var(--accent-brand-glow)` |
| 1072 | `background-color: rgba(201, 233, 142, 0.1)` (action-card icon) | `background-color: var(--accent-brand-subtle)` |
| 1073 | `color: var(--accent-lime)` | `color: var(--accent-brand)` |
| 1143 | `border-color: rgba(201, 233, 142, 0.4)` (`.action-card.active`) | `border-color: rgba(31, 78, 61, 0.32)` |
| 1144 | `background-color: rgba(201, 233, 142, 0.04)` | `background-color: rgba(31, 78, 61, 0.04)` |
| 1245 | `background-color: rgba(13, 19, 31, 0.4)` (`.edit-table thead`) | `background-color: rgba(250, 249, 245, 0.7)` |
| 1254 | `background-color: rgba(248, 113, 113, 0.08)` (invalid row) | `background-color: rgba(201, 42, 42, 0.06)` |
| 1258 | `border-color: rgba(248, 113, 113, 0.35)` | `border-color: rgba(201, 42, 42, 0.35)` |
| 1305 | `background-color: rgba(13, 19, 31, 0.5)` (editor footer) | `background-color: rgba(250, 249, 245, 0.7)` |
| 1546 | `background-color: rgba(201, 233, 142, 0.1)` (`.weight-badge`) | `background-color: rgba(31, 78, 61, 0.08)` |
| 1547 | `color: var(--accent-lime)` | `color: var(--accent-brand)` |
| 1558 | `linear-gradient(135deg, rgba(201, 233, 142, 0.05) 0%, rgba(18, 25, 39, 0.6) 100%)` | `linear-gradient(135deg, rgba(31, 78, 61, 0.05) 0%, #FFFFFF 100%)` |
| 1559 | `border: 1px solid rgba(201, 233, 142, 0.2)` | `border: 1px solid var(--border-default)` |
| 1595 | `radial-gradient(circle at 60% 40%, rgba(21, 34, 48, 0.92) 0%, rgba(13, 20, 30, 0.98) 55%, #090d15 100%)` | `radial-gradient(circle at 60% 40%, rgba(255, 255, 255, 0.92) 0%, rgba(242, 240, 234, 0.98) 55%, #F2F0EA 100%)` |
| 1596 | `radial-gradient(circle, rgba(201, 233, 142, 0.08) 1px, transparent 1px)` | `radial-gradient(circle, rgba(20, 22, 26, 0.06) 1px, transparent 1px)` |
| 1628 | `background-color: rgba(18, 25, 39, 0.75)` (auth preview card) | `background-color: #FFFFFF` |
| 1631 | `box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)` | `box-shadow: var(--shadow-lg)` |
| 1775 | `background-color: rgba(201, 233, 142, 0.12)` (mobile nav selected) | `background-color: var(--accent-brand-subtle)` |
| 1776 | `color: var(--accent-lime)` | `color: var(--accent-brand)` |
| 1777 | `border: 1px solid rgba(201, 233, 142, 0.25)` | `border: 1px solid rgba(31, 78, 61, 0.16)` |

`frontend/src/components/AuthView.tsx`: line 72 `color: 'var(--accent-lime)'` → `'var(--accent-brand)'` and `backgroundColor: 'rgba(201, 233, 142, 0.1)'` → `'var(--accent-brand-subtle)'`; line 81 `stroke="#1a2538"` → `stroke="#E3E0D6"`; line 85 `stroke="#c9e98e"` → `stroke="#1F4E3D"`; line 93 `stroke="#638af7"` → `stroke="#3B5BDB"`; line 102 `stroke="#39b8a1"` → `stroke="#099268"`; line 114 `backgroundColor: '#c9e98e'` → `'#1F4E3D'`; line 119 `color: '#638af7'` → `'#3B5BDB'`; line 122 `backgroundColor: '#638af7'` → `'#3B5BDB'`; line 127 `color: '#39b8a1'` → `'#099268'`; line 130 `backgroundColor: '#39b8a1'` → `'#099268'`.

`frontend/src/components/ui/SpotlightCard.tsx` line 12: default prop `spotlightColor = 'rgba(201, 233, 142, 0.09)'` → `'rgba(20, 22, 26, 0.045)'`.

`frontend/src/components/ui/BorderBeam.tsx` line 10: default `color = '#c9e98e'` → `'#1F4E3D'`.

`frontend/src/components/ImportStudio.tsx` line 225: `<BorderBeam duration={5} color="#c9e98e" />` → `color="#1F4E3D"`; line 265: `<BorderBeam duration={8} color="#4ade80" />` → `color="#237A34"`.

`frontend/index.html` line 6: `<meta name="theme-color" content="#0d1118" />` → `content="#F2F0EA"`.

**2.2 Field borders** — inputs, selects and the date input currently rely on `--border-default` (`#D6D2C6`, 1.51:1 on white). Give form controls the new `--border-control` token so their boundary is perceivable: in `frontend/src/styles.css`, add to the input/select rule (the one at ~line 296-302 that sets `border: 1px solid var(--border-default)`):

```css
  border-color: var(--border-control);
```

and keep the existing focus rule (line ~310-314) but change `border-color: var(--accent-lime)` → `var(--accent-brand)` and `box-shadow: 0 0 0 1px var(--accent-lime), 0 0 12px var(--accent-lime-subtle)` → `box-shadow: 0 0 0 1px var(--accent-brand), 0 0 12px var(--accent-brand-glow)`.

**2.3 Focus ring** — `frontend/src/styles.css:166-169`:

```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--bg-canvas), 0 0 0 4px var(--accent-brand);
}
```

**2.4 Paper motif** — the paper identity comes from hairline rules, not glow. Add to `frontend/src/styles.css`:

```css
.panel,
.surface,
.stat-card,
.data-table,
.edit-table {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-sm);
}
```

and keep the existing `.panel { padding: 22px 24px; }`.

### Step 3 — Holding palette module

Create `frontend/src/lib/palette.ts` (new file; no `lib/` directory exists yet):

```ts
export const HOLDING_COLORS = [
  '#3B5BDB',
  '#099268',
  '#D66A00',
  '#7048E8',
  '#E64980',
  '#0B7285',
  '#495057',
] as const

export function holdingColor(index: number): string {
  return HOLDING_COLORS[index % HOLDING_COLORS.length]
}
```

Each colour is ≥3:1 against `#FFFFFF` (3.55:1 worst case, `#D66A00`), so the ribbon and the table swatches are legible as graphics on the white card. The palette is the single source of truth: the CSS `.dot-0 … .dot-4` rules (styles.css:1454-1458) are deleted and no other file may hardcode a holding colour.

### Step 4 — Allocation ribbon component

Create `frontend/src/components/AllocationRibbon.tsx`:

```tsx
import { useMemo } from 'react'
import { holdingColor } from '../lib/palette'
import type { Position } from '../api'

const MAX_SEGMENTS = 12
export const CONCENTRATION_PCT = 25

interface AllocationRibbonProps {
  positions: Position[]
  hoveredSymbol: string | null
  onHover: (symbol: string | null) => void
}
```

Behaviour:

- **Segmentation** — if `positions.length <= MAX_SEGMENTS`, render one segment per position. If more, render the first `MAX_SEGMENTS` positions plus a final aggregate segment covering the rest. The aggregate segment's colour is `#8A8578` (neutral, 3.68:1 on white) and it is never given a holding index for colouring.
- **Widths** — each segment is a `<span>` with `flex-basis: 0; flex-grow: <Number(weight_pct)>; min-width: 3px`. Proportionality is exact because flex distributes by grow factor; the 3px floor keeps sub-1% holdings visible.
- **Concentration marker** — a position whose `Number(weight_pct) >= CONCENTRATION_PCT` gets the class `ribbon-segment--concentrated`, which renders a 2px inset ring in `--status-warning` (inset, so it changes no layout).
- **Accessibility** — the whole ribbon is `aria-hidden="true"` and contains no focusable elements: the holdings table directly below already exposes every holding, weight and value as text, so the ribbon is a redundant visual encoding and must not be announced twice. Cross-highlighting is therefore pointer-only; no keyboard path is required.
- **Hover** — each segment calls `onHover(symbol)` on `onMouseEnter` and `onHover(null)` on `onMouseLeave`. The component applies `is-active` to the segment whose symbol matches `hoveredSymbol`, and sets `has-hover` on the container when `hoveredSymbol` is not null.
- **Caption** — when `positions.length > MAX_SEGMENTS`, render below the ribbon: `{shown} of {total} holdings · Other {restCount} = {restWeight}%`, where `restCount = total - shown`, `restWeight = (100 - sum of shown weights).toFixed(1)`, and `shown`/`total` are the counts. The caption is plain text (not a tooltip) so the aggregation is never hidden.
- **Memoisation** — compute segments with `useMemo` keyed on `positions`.

CSS (append to `frontend/src/styles.css`):

```css
.ribbon {
  display: flex;
  gap: 2px;
  height: 40px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.ribbon-segment {
  flex-basis: 0;
  min-width: 3px;
  transform-origin: left center;
  animation: ribbon-sweep 620ms var(--ease-smooth) both;
  animation-delay: calc(var(--i, 0) * 40ms);
  transition: opacity var(--duration-fast) var(--ease-smooth);
}

.ribbon-segment--concentrated {
  box-shadow: inset 0 0 0 2px var(--status-warning);
}

.ribbon.has-hover .ribbon-segment { opacity: 0.35; }
.ribbon.has-hover .ribbon-segment.is-active { opacity: 1; }

@keyframes ribbon-sweep {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

The existing global `@media (prefers-reduced-motion: reduce)` block (styles.css:1808) already forces `animation-duration: 0.01ms`, so the sweep is disabled for users who ask for reduced motion — no extra code needed.

### Step 5 — Dashboard restructure

Rewrite `frontend/src/components/DashboardView.tsx`:

**5.1 Delete** the `AllocationChart` component (lines 20-63) and the `import ReactECharts from 'echarts-for-react'` (line 3) and the `useMemo` import if it becomes unused. Delete the whole "Visual Grid: Allocation Donut & Exposure Breakdown" block (lines 140-206) — the donut panel, the legend grid and the exposure meter panel. Delete the `CountUp` import (line 9) and both usages (lines 112-117 and 127).

**5.2 Hero block** — replace the three stat cards (lines 107-138) with a single hero block above the ribbon, using these exact strings:

```tsx
<span className="eyebrow">PORTFOLIO OVERVIEW</span>
<h2>{portfolio.name}</h2>
<p className="figure-hero">{currency(data.total_value)}</p>
<p className="muted">
  Snapshot as of {data.snapshot.as_of} · USD valuations provided by you
</p>
<p className="hero-meta">
  <span className="tabular-numbers">{data.positions.length}</span> holdings · largest{' '}
  <span className="tabular-numbers">{largest?.symbol ?? '—'}</span>{' '}
  <span className="tabular-numbers">{largest ? percent(largest.weight_pct) : '—'}</span>
</p>
```

Keep the existing `split-heading` wrapper and the "Update snapshot" button (line 100-104) unchanged in behaviour.

**5.3 Ribbon panel** — a `.panel` (paper card) holding the ribbon, with the existing panel header copy:

```tsx
<div className="panel">
  <div className="panel-header">
    <div>
      <h3>Allocation</h3>
      <p>Market value by holding</p>
    </div>
    <span className="status-pill">USD</span>
  </div>
  <AllocationRibbon
    positions={data.positions}
    hoveredSymbol={hoveredSymbol}
    onHover={setHoveredSymbol}
  />
</div>
```

**5.4 Holdings table** — keep the existing table markup and header row (`Security`, `Quantity`, `Unit price`, `Market value`, `Weight`). Changes:

- The Security cell gains a colour swatch that binds the row to its ribbon segment: `<span className="swatch" style={{ background: holdingColor(index) }} aria-hidden="true" />` placed before the symbol. The `<td>` must gain `data-label="Security"` (and the other cells `data-label="Quantity"`, `"Unit price"`, `"Market value"`, `"Weight"`) for the mobile card layout in step 6.
- The Weight cell renders the badge plus, when `Number(p.weight_pct) >= CONCENTRATION_PCT`, a factual marker:

```tsx
<span className="weight-flag">25%+</span>
<span className="sr-only">at least 25 percent of portfolio</span>
```

The wording states a computed fact about the user's own snapshot; it is not advice and must not be reworded into a recommendation.

**5.5 Cross-highlight state** — add `const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null)` to `DashboardView`. A table `<tr>` gets `onMouseEnter={() => setHoveredSymbol(p.symbol)}` / `onMouseLeave={() => setHoveredSymbol(null)}` and the class `is-highlighted` when `hoveredSymbol === p.symbol`.

**5.6 Table CSS additions** — append to `frontend/src/styles.css`:

```css
.swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-right: 8px;
  vertical-align: middle;
}

.data-table tr.is-highlighted { background-color: var(--accent-brand-subtle); }

.weight-flag {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background-color: var(--status-warning-bg);
  color: var(--status-warning);
  border: 1px solid var(--status-warning-border);
  font-size: 0.6875rem;
  font-weight: 700;
}

.hero-meta {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}
```

**5.7 CSS deletions** — remove the now-unused rules from `frontend/src/styles.css`: `.stat-grid` (1337-1342), `.stat-card` (1344-1350), `.stat-card-label` (1352-1356), `.stat-card-value` (1358-1364), `.stat-card-caption` (1366-1369), `.visual-grid` (1371-1375), `.chart-wrap` (1394-1398), `.chart-center-badge` and children (1400-1425), `.chart-legend` (1427-1432), `.legend-item` (1434-1439), `.legend-item-left` (1441-1446), `.legend-dot` (1448-1451), `.dot-0 … .dot-4` (1454-1458), `.exposure-list` (1460-1465), `.exposure-item` (1467-1471), `.exposure-header` (1473-1479), `.exposure-title` (1481-1485), `.ticker-pill` (1487-1496), `.meter-track` (1498-1503), `.meter-fill` (1505-1508).

### Step 6 — Mobile

**6.1 Holdings table becomes a card list below 640px** — append to `frontend/src/styles.css`:

```css
@media (max-width: 640px) {
  .data-table thead { display: none; }
  .data-table, .data-table tbody, .data-table tr, .data-table td { display: block; width: 100%; }
  .data-table tr { padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); }
  .data-table td {
    border: none;
    padding: 3px 0;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    text-align: right;
  }
  .data-table td::before {
    content: attr(data-label);
    color: var(--text-muted);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-align: left;
  }
  .data-table td:first-child { padding-bottom: 8px; }
  .ribbon { height: 24px; }
  .figure-hero { font-size: 2.25rem; }
}
```

The `data-label` attributes come from step 5.4. The market value and weight become labelled rows inside the card, so nothing is clipped or off-screen.

**6.2 Portfolio switcher truncation** — in `frontend/src/components/PortfolioSwitcher.tsx`, add a `title={portfolio.name}` attribute to the switcher trigger button (the element rendering the selected portfolio name) so the full name is available on hover, and in `frontend/src/styles.css` constrain the trigger:

```css
.portfolio-switcher-trigger {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

If the trigger element carries a different class name, apply the rule to the class it actually uses and add the `title` attribute to that same element.

### Step 7 — Motion cleanup

- `frontend/src/components/DashboardView.tsx`: the `CountUp` usages are removed in step 5.1, so `frontend/src/components/ui/CountUp.tsx` is deleted. It has no CSS rules of its own.
- `frontend/src/components/ImportStudio.tsx` lines 204-214: replace `<MagneticButton type="button" className="button primary" …>` with a plain `<button type="button" className="button primary" …>` (same children, same `onClick` body), and remove the `MagneticButton` import (line 19).
- `frontend/src/components/OverviewEmptyState.tsx` lines 40-48: the same replacement — plain `<button type="button" className="button primary" onClick={onAddHoldings}>`.
- Delete `frontend/src/components/ui/MagneticButton.tsx` (no CSS rules reference it).
- Keep `FadeContent`, `AnimatedContent`, `BlurText`, `SpotlightCard` and `BorderBeam`; BorderBeam is recoloured in step 2.1. The import flow's explicit "Validate" step is unchanged.

### Step 8 — Chrome and auth surfaces

Apply the paper treatment to the remaining shell so no dark surface survives:

- **Sidebar** — `background-color: var(--bg-surface)`, `border-right: 1px solid var(--border-subtle)`, nav item text `var(--text-secondary)`, active item per step 2.1. The "Private to your account" badge keeps its shape but uses `var(--bg-surface-elevated)` and `--text-secondary`.
- **Topbar** — the remapped translucent paper background (step 2.1) plus `border-bottom: 1px solid var(--border-subtle)` (already present).
- **User avatar** — keep the dark ink chip with white letter (step 2.1) so it reads as a badge on paper.
- **Portfolio switcher popover** — `background-color: var(--bg-surface)`, `border: 1px solid var(--border-default)`, `box-shadow: var(--shadow-popover)`; the `Kbd` "ESC" badge uses `var(--bg-surface-elevated)`, `var(--text-muted)`, `font-family: var(--font-mono)`.
- **Mobile nav** — `background-color: var(--bg-subtle)`, `border-bottom: 1px solid var(--border-subtle)`, selected item per step 2.1.
- **Dialog / create-portfolio modal** — overlay per step 2.1; panel `background-color: var(--bg-surface)`, `box-shadow: var(--shadow-dialog)`; the "Cancel" button keeps `.button.ghost`.
- **Auth screen** — hero column background per step 2.1 (paper gradient + ink dot grid); preview card `background-color: #FFFFFF`, `border: 1px solid var(--border-default)`, `box-shadow: var(--shadow-lg)`; the inline SVG donut and preview bars recoloured per step 2.1; the "Illustrative preview" pill uses the brand tokens; the headline keeps `BlurText`; the submit button is `.button primary` (brand green, white text).
- **Notice banner** (the "Financial metrics not available yet" block) keeps its copy, border and icon, recoloured per step 2.1.

### Step 9 — Dependency and file cleanup

- `frontend/package.json`: `echarts` and `echarts-for-react` removed (step 1.1); the two `@fontsource-variable/*` packages added.
- Deleted files: `frontend/src/components/ui/CountUp.tsx`, `frontend/src/components/ui/MagneticButton.tsx`.
- New files: `frontend/src/lib/palette.ts`, `frontend/src/components/AllocationRibbon.tsx`.
- `frontend/package-lock.json` regenerated by `npm install`.

## Critical files & anchors

- `frontend/src/styles.css` — `:root` token block (lines 7-69) is fully replaced; the 50-row remap table in step 2.1 touches every hardcoded colour; the rule blocks deleted in step 5.7.
- `frontend/src/components/DashboardView.tsx` — `AllocationChart` (20-63), stat cards (107-138), visual grid (140-206), holdings table (208-249): the donut, legend, meter list and stat cards all go, replaced by the hero block + ribbon + restyled table.
- `frontend/src/components/AuthView.tsx` — lines 71-131 contain the inline SVG preview donut and preview bars with hardcoded hexes; they are the only literal colours outside the CSS file.
- `frontend/src/components/ImportStudio.tsx` — `MagneticButton` (19, 204-214) and the two `BorderBeam` colours (225, 265).
- `frontend/src/main.tsx` — line 5, where the two `@fontsource-variable` imports must be inserted before `import './styles.css'`.

## Verification

Run from `D:\Cyn\portfolio-intelligence-starter (1)\portfolio-intelligence-mvp`.

**Build and tests**

1. `cd frontend && npm install && npm run build` — must succeed (`tsc -b` + `vite build`). Record the new JS chunk size; the baseline was `dist/assets/index-BjIhidjO.js 1,389.90 kB │ gzip: 455.40 kB`, and removing ECharts should reduce it substantially.
2. `grep -ri "echarts" frontend/src dist/assets` — must return nothing.
3. `cd backend && python -m pytest -q` — must still report 21 passed, 1 skipped (no backend change; this guards against accidental API edits).

**Live UI checks** (backend on `127.0.0.1:8000`, frontend dev server on `127.0.0.1:5173`; the Vite proxy forwards `/api`)

Seed a temporary account with six holdings, then delete it afterwards (the local SQLite DB must be left with only the pre-existing accounts):

```bash
B=http://127.0.0.1:5173; O='Origin: http://127.0.0.1:5173'; J=/tmp/ribbon.txt; rm -f $J
curl -s -c $J -o /dev/null -w "register=%{http_code}\n" -X POST $B/api/auth/register -H "Content-Type: application/json" -H "$O" -d '{"email":"ribbon-check@example.com","password":"ribbon-check-pass-12345"}'
CSRF=$(curl -s -b $J $B/api/auth/me | sed -E 's/.*"csrf_token":"([^"]+)".*/\1/')
PID=$(curl -s -b $J -X POST $B/api/portfolios -H "Content-Type: application/json" -H "$O" -H "X-CSRF-Token: $CSRF" -d '{"name":"Ribbon Check"}' | sed -E 's/.*"id":([0-9]+).*/\1/')
# commit a 6-row snapshot (NVDA, AAPL, MSFT, AMZN, GOOGL, VTI) to $PID via POST /api/portfolios/$PID/snapshots with rows using snapshot_date 2026-10-21
```

Then in the browser (Chromium via the browser tool, `http://127.0.0.1:5173`):

4. **Fonts loaded** — `document.fonts.check('16px "Geist Variable"')` is `true` and `document.fonts.check('16px "Geist Mono Variable"')` is `true`; the hero figure's computed `font-family` contains `Geist Mono Variable`; the `<h2>` computed `font-family` contains `Geist Variable`.
5. **Theme applied** — the hero figure's computed `color` is `rgb(20, 22, 26)`; the page background is `rgb(242, 240, 234)`; no element on the dashboard renders with a background darker than `rgb(233, 233, 233)` (assert by scanning computed backgrounds of the shell, panels and table).
6. **Label contrast** — the computed color of `.eyebrow`, `.data-table th` and `.panel-header p` is `rgb(95, 102, 114)` (5.78:1 on white, 5.08:1 on canvas) — the previous `#64748b` (4.09:1) must be gone.
7. **Ribbon** — the number of `.ribbon-segment` elements equals 6 for a six-holding portfolio; each segment's computed `background-color` equals the corresponding `HOLDING_COLORS` entry; the sum of segment widths is within 2px of the ribbon's content width; hovering segment 1 adds `is-active` to that segment and `is-highlighted` to the matching `<tr>`.
8. **Single encoding** — the dashboard contains no `canvas` element (ECharts is gone) and no element matching `.exposure-list`, `.chart-legend` or `.stat-card`.
9. **Mobile** — at a 390×844 viewport, `document.querySelector('.table-scroll').scrollWidth === document.querySelector('.table-scroll').clientWidth` (no horizontal scroll), the market value text of the first holding is fully within the viewport bounding box, and the ribbon height is 24px.
10. **Motion** — the hero figure's text content equals the formatted total immediately after load (`$60,006.25`-style string with no intermediate values), proving `CountUp` is gone.
11. **Import surface** — the dropzone, "Choose CSV" button and editor table render on paper; the "Choose CSV" button does not translate on hover (no magnetic offset).
12. **Screenshots** — capture dashboard, import studio and auth at 1440×900 and 390×844 and confirm no dark panels, no clipped numbers, and no lime anywhere.

**Cleanup after verification** — delete the temporary account and its portfolio from `backend/portfolio_local.db` (user row, `user_sessions` rows, portfolio row, `holding_snapshots` and `snapshot_positions` rows), leaving the pre-existing accounts untouched; delete `/tmp/ribbon.txt`.

## Assumptions & contingencies

- The paper theme replaces the dark theme entirely; no dark-mode variant is kept.
- Fonts are self-hosted npm packages, not a Google Fonts `<link>` — this keeps the Docker/nginx build working offline and avoids a runtime third-party request.
- If the npm registry is unavailable at install time, `npm install` cannot fetch the two `@fontsource-variable` packages: vendor the woff2 files for Geist and Geist Mono into `frontend/src/fonts/`, declare `@font-face` blocks with the same family names (`Geist Variable`, `Geist Mono Variable`) and `font-display: swap`, and point `--font-sans` / `--font-mono` at them instead of importing the packages.
- If `grep -rn "echarts" frontend/src` returns any consumer other than `DashboardView.tsx`, keep both ECharts dependencies and delete only the chart; the ribbon and the rest of the plan are unaffected.
- If the implementer's portfolio has more than 12 holdings, the ribbon shows the top 12 plus a neutral "Other" segment with the visible caption specified in step 4; no aggregation is ever implicit.
- The ≥25% marker states a computed fact about the user's own snapshot and is deliberately worded as a threshold, not a recommendation; the product's no-advice stance (README "Financial rules") must not be softened by rewording.
- The user's own accounts and portfolios in `backend/portfolio_local.db` are never modified by this work; verification data is created and removed within the same session.
