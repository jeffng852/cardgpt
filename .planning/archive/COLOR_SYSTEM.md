# CardGPT Color System

ChatGPT-inspired color palette for light and dark modes.

## Color Philosophy

- **Clean and minimal**: White/gray backgrounds with subtle hierarchy
- **High contrast**: Readable text with clear visual hierarchy
- **Teal/Green accent**: Primary actions use #10a37f (light) / #19c37d (dark)
- **Consistent states**: Success, error, warning, info colors across modes

## Usage in Components

All colors are available as Tailwind CSS utilities:

```tsx
// Backgrounds
<div className="bg-background">         {/* Main background */}
<div className="bg-background-secondary"> {/* Elevated sections */}
<div className="bg-background-tertiary">  {/* Input fields */}

// Text
<h1 className="text-foreground">        {/* Headings */}
<p className="text-foreground-muted">   {/* Body text */}
<span className="text-foreground-subtle"> {/* Captions */}

// Borders
<div className="border-border">         {/* Default borders */}
<div className="border-border-light">   {/* Subtle dividers */}

// Primary/Accent
<button className="bg-primary hover:bg-primary-hover text-white">
<div className="bg-primary-light text-primary"> {/* Subtle highlight */}

// Cards
<div className="bg-card-bg hover:bg-card-hover border border-border">

// States
<span className="text-success">  {/* Success messages */}
<span className="text-error">    {/* Error messages */}
<span className="text-warning">  {/* Warnings */}
<span className="text-info">     {/* Info messages */}
```

## Light Mode Palette

| Token | Color | Usage |
|-------|-------|-------|
| `background` | `#ffffff` | Main page background |
| `background-secondary` | `#f7f7f8` | Elevated sections, sidebars |
| `background-tertiary` | `#ececf1` | Input fields, disabled states |
| `foreground` | `#2e2e2e` | Headings, primary text |
| `foreground-muted` | `#6e6e80` | Body text, descriptions |
| `foreground-subtle` | `#8e8ea0` | Captions, metadata |
| `border` | `#e5e5e5` | Default borders |
| `border-light` | `#f0f0f0` | Subtle dividers |
| `primary` | `#10a37f` | Primary actions, links |
| `primary-hover` | `#0d8968` | Hover state for primary |
| `primary-light` | `#e6f7f2` | Subtle primary backgrounds |
| `card-bg` | `#ffffff` | Card backgrounds |
| `card-hover` | `#f9f9f9` | Card hover state |
| `success` | `#10a37f` | Success states |
| `error` | `#ef4146` | Error states |
| `warning` | `#ff9500` | Warning states |
| `info` | `#0084ff` | Info states |

## Dark Mode Palette

| Token | Color | Usage |
|-------|-------|-------|
| `background` | `#212121` | Main page background |
| `background-secondary` | `#2f2f2f` | Elevated sections, sidebars |
| `background-tertiary` | `#3f3f3f` | Input fields, disabled states |
| `foreground` | `#ececec` | Headings, primary text |
| `foreground-muted` | `#c5c5d2` | Body text, descriptions |
| `foreground-subtle` | `#9b9ba8` | Captions, metadata |
| `border` | `#4d4d4d` | Default borders |
| `border-light` | `#3a3a3a` | Subtle dividers |
| `primary` | `#19c37d` | Primary actions, links |
| `primary-hover` | `#1a9f6b` | Hover state for primary |
| `primary-light` | `#1a4d3c` | Subtle primary backgrounds |
| `card-bg` | `#2f2f2f` | Card backgrounds (elevated) |
| `card-hover` | `#3a3a3a` | Card hover state |
| `success` | `#19c37d` | Success states |
| `error` | `#ff5f5f` | Error states |
| `warning` | `#ffb340` | Warning states |
| `info` | `#4da6ff` | Info states |

## Design Principles

### Hierarchy
- Use `foreground` for headings and important text
- Use `foreground-muted` for body text
- Use `foreground-subtle` for secondary information

### Layering
- Main background: `background`
- Elevated cards/sections: `background-secondary` (light) or `card-bg` (dark)
- Input fields: `background-tertiary`

### Actions
- Primary actions: `bg-primary` with white text
- Secondary actions: `border-border` with `text-foreground`
- Destructive actions: `bg-error` with white text

### Accessibility
- All text colors meet WCAG AA contrast requirements
- Focus states should use `primary` color with visible outline
- Hover states should be subtle but noticeable

## Implementation Notes

- Uses Tailwind CSS v4 `@theme inline` syntax
- Automatically switches based on system preference (`prefers-color-scheme`)
- All colors defined as CSS custom properties in `globals.css`
- Dark mode is not forced - respects user's system settings

## Future Enhancements

If manual dark mode toggle is needed:
1. Add `[data-theme="dark"]` selector alongside `@media (prefers-color-scheme: dark)`
2. Create state management for theme toggle
3. Persist user preference in localStorage

---

**Last Updated**: 2026-01-20
