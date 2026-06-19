# Tailwind v4 Chart Colors

## Problem
In Tailwind CSS v4, theme color variables such as `--chart-1` to `--chart-5` are defined using `oklch(...)` color function syntax in `index.css`:
```css
--chart-1: oklch(0.809 0.105 251.813);
```
Standard Shadcn/ui chart setups define chart colors by wrapping these variables in `hsl(...)`:
```tsx
const CHART_CONFIG = {
  unifiedVnd: { label: 'Revenue (VND)', color: 'hsl(var(--chart-1))' },
}
```
This evaluates to `hsl(oklch(...))` in CSS, which is invalid syntax and prevents the chart color from being applied.

## Solution
Use `var(--chart-1)` directly as the color value in the chart config instead of wrapping it in `hsl(...)`:
```tsx
const CHART_CONFIG = {
  unifiedVnd: { label: 'Revenue (VND)', color: 'var(--chart-1)' },
}
```
This allows the variable to evaluate directly to the valid OKLCH color.
