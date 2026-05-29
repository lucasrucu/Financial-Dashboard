# Styles

## Conventions

- **Tailwind CSS v3** is the only styling mechanism. No custom CSS files, no inline `style={}` props unless Tailwind genuinely cannot cover the use case.
- **shadcn/ui** provides base primitives (Button, Card, Input, Table, Badge, Dialog, etc.) from `components/ui/`.
- **Base UI** used for lower-level headless primitives where shadcn doesn't cover.
- **Dark mode** is the default and only theme. Class strategy (`class="dark"` on `<html>`).

---

## Color System

Colors are defined as HSL CSS variables in `app/globals.css` and consumed by Tailwind via `tailwind.config.ts`.

| Token | Usage |
|---|---|
| `background` | Page background (slate-950 range) |
| `foreground` | Primary text |
| `card` / `card-foreground` | Card surfaces |
| `primary` / `primary-foreground` | Brand accent, CTA buttons |
| `secondary` / `secondary-foreground` | Muted actions |
| `muted` / `muted-foreground` | Placeholder text, labels |
| `accent` / `accent-foreground` | Hover states |
| `destructive` | Delete / error actions |
| `border` | Dividers, input outlines |
| `ring` | Focus rings |

Chart-specific palette (for Recharts):

| Token | Usage |
|---|---|
| `chart-1` … `chart-5` | Category colors in spending charts |

Always reference these tokens (`bg-background`, `text-foreground`, etc.) — never hardcode hex or raw slate values.

---

## Tailwind Config Highlights (`tailwind.config.ts`)

```ts
darkMode: ["class"]           // dark mode via .dark class
theme.extend.colors           // HSL var tokens (see above)
theme.extend.borderRadius     // lg, md, sm wired to --radius CSS var
plugins: [tailwindcss-animate] // used for modal/sheet enter/exit animations
```

---

## shadcn/ui Usage

- Components live in `components/ui/`. **Do not edit them** — re-run shadcn CLI to update.
- Toast notifications: `Sonner` (`components/ui/sonner.tsx`). Use `toast.success()`, `toast.error()` — never `alert()`.
- Always prefer shadcn primitives over rolling custom elements for: buttons, inputs, dialogs, badges, tables, cards.

---

## Layout Structure

```
RootLayout (app/layout.tsx)
  └── Providers (React Query)
        └── DashboardLayout (app/(dashboard)/layout.tsx)
              ├── Sidebar      ← navigation, mobile-responsive
              ├── TopNav       ← currency toggle, page title area
              └── PageWrapper  ← consistent page padding + title
```

- `Sidebar` handles mobile toggle (hamburger menu).
- `PageWrapper` wraps every page for consistent heading + description spacing.

---

## Icons

Use **Lucide React** (`lucide-react`) exclusively. No other icon libraries. Import individually to keep bundle small:

```tsx
import { TrendingUp, Wallet } from "lucide-react"
```

---

## Recharts

- Used only in `SpendingChart.tsx`.
- Wrap in a `ResponsiveContainer` — never set fixed pixel dimensions.
- Fill colors come from `chart-1` … `chart-5` CSS variables via `hsl(var(--chart-N))`.

---

## Animations

- Tailwind Animate plugin handles enter/exit transitions on modals and sheets.
- Keep animations subtle — prefer `duration-200` or less for interactive feedback.
- Do not introduce Framer Motion or other animation libraries.
