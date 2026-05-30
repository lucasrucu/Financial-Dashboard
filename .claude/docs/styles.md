# Styles

## Conventions

- **Tailwind CSS v3** is the only styling mechanism. No custom CSS files, no inline `style={}` props unless Tailwind genuinely cannot cover the use case.
- **shadcn/ui** provides base primitives (Button, Card, Input, Table, Badge, Dialog, etc.) from `components/ui/`.
- **Base UI** used for lower-level headless primitives where shadcn doesn't cover.
- **Themes** are named color palettes applied at runtime via CSS variables on `<html data-theme="…">`.

---

## Color System

Colors are defined as HSL CSS variables and consumed by Tailwind via `tailwind.config.ts`. Fallback values live in `app/globals.css`; active theme values are applied by `lib/applyTheme.ts`.

| Token | Usage |
|---|---|
| `background` | Page background |
| `foreground` | Primary text |
| `card` / `card-foreground` | Card surfaces |
| `primary` / `primary-foreground` | Brand accent, CTA buttons |
| `secondary` / `secondary-foreground` | Muted actions |
| `muted` / `muted-foreground` | Placeholder text, labels |
| `accent` / `accent-foreground` | Hover states |
| `destructive` | Delete / error actions |
| `positive` / `negative` | Income / expense financial values |
| `border` | Dividers, input outlines |
| `ring` | Focus rings |
| `sidebar-*` | Sidebar shell, nav active/hover states |

Always reference these tokens (`bg-background`, `text-foreground`, `bg-sidebar`, etc.) — never hardcode hex or raw slate values.

Category colors in `constants/categories.ts` remain fixed hex for chart segments.

---

## Multi-Theme System

### Built-in themes (`themes/`)

Each theme is one TypeScript file exporting `{ id, name, variables }`:

```
themes/
  types.ts       # Token keys + import validation
  default.ts     # Green accent (default)
  midnight.ts    # Blue accent
  index.ts       # Registry — add new themes here
```

**Add a theme via code:**

1. Copy `themes/default.ts` → `themes/my-theme.ts`
2. Edit HSL values and `name`
3. Import and append to `builtInThemes` in `themes/index.ts`
4. Restart dev server — it appears in the Sidebar theme picker

### Runtime switching

- **Sidebar** → Theme section lists built-in + imported custom themes
- Selection persists in `localStorage` via `stores/themeStore.ts` (Zustand)
- **Import theme…** accepts JSON with `{ name, variables }` matching all required tokens

### JSON import example

```json
{
  "name": "Warm Dark",
  "variables": {
    "background": "222.2 84% 4.9%",
    "foreground": "210 40% 98%",
    "primary": "24 95% 53%"
  }
}
```

All tokens listed in `themes/types.ts` (`THEME_TOKEN_KEYS`) are required.

---

## Tailwind Config Highlights (`tailwind.config.ts`)

```ts
darkMode: ["class"]
theme.extend.colors    // HSL var tokens including sidebar, positive, negative
theme.extend.borderRadius  // lg, md, sm wired to --radius CSS var
plugins: [tailwindcss-animate]
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
  └── Providers (React Query + ThemeInitializer)
        └── DashboardLayout (app/(dashboard)/layout.tsx)
              ├── Sidebar      ← navigation + ThemePicker
              ├── TopNav       ← currency toggle
              └── PageWrapper  ← consistent page padding + title
```

- `Sidebar` handles mobile toggle (hamburger menu) and theme selection.
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
- Tooltip colors read from theme CSS vars via `getThemeCssVar()`.
- Category segment fills use hex from `constants/categories.ts`.

---

## Animations

- Tailwind Animate plugin handles enter/exit transitions on modals and sheets.
- Keep animations subtle — prefer `duration-200` or less for interactive feedback.
- Do not introduce Framer Motion or other animation libraries.
