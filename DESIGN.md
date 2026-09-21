---
version: alpha
name: BookOracle
description: A quiet, dark-first reading room. Lavender-violet ink on deep navy-black, built as one design family with Asset Forge.
colors:
  # --- Brand (shared with Asset Forge, so KP's apps read as one family) ---
  primary: "#ac8aff"
  primary-container: "#8f60fa"
  primary-dim: "#8455ef"
  primary-fixed: "#cbb6ff"
  on-primary: "#280067"
  on-tertiary: "#356b22"
  on-tertiary-fixed: "#1a4f07"
  on-error: "#490013"
  secondary: "#2fd9f4"
  secondary-container: "#002a31"
  secondary-dim: "#00cbe6"
  tertiary: "#edffdf"
  tertiary-container: "#bdfca1"
  tertiary-dim: "#b0ed94"
  # --- Surfaces, darkest to lightest ---
  background: "#0a0e19"
  surface: "#0a0e19"
  surface-container-lowest: "#000000"
  surface-container-low: "#0e1320"
  surface-container: "#131929"
  surface-container-high: "#181f31"
  surface-container-highest: "#1d253a"
  surface-bright: "#232c43"
  # --- Text and lines ---
  on-surface: "#dee5ff"
  on-surface-variant: "#a3aac5"
  outline: "#6d758d"
  outline-variant: "#40475e"
  # --- Status ---
  error: "#fd6f85"
  error-container: "#8a1632"
  on-error-container: "#ff97a3"
  # --- Light theme counterparts (same hue family, inverted lightness) ---
  light-background: "#faf8ff"
  light-surface-container-low: "#f4f2fa"
  light-surface-container: "#eeeaf6"
  light-surface-container-high: "#e8e4f0"
  light-on-surface: "#1a1b21"
  light-on-surface-variant: "#525463"
  light-primary: "#6e3bd7"
  light-secondary: "#006573"
  light-tertiary: "#376d24"
  light-outline-variant: "#c9c6d4"
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: 2.25rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h1:
    fontFamily: Space Grotesk
    fontSize: 1.75rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  h2:
    fontFamily: Space Grotesk
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.3
  body-md:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
  numeric:
    fontFamily: Space Grotesk
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
components:
  app-shell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
  sidebar:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
    padding: 16px
  top-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
  card:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 16px
  card-hover:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
  panel-sunken:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.lg}"
    padding: 16px
  panel-raised:
    backgroundColor: "{colors.surface-container-highest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
  field:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    height: 40px
  field-placeholder:
    textColor: "{colors.on-surface-variant}"
  divider:
    backgroundColor: "{colors.outline-variant}"
  divider-strong:
    backgroundColor: "{colors.outline}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 10px
  button-primary-hover:
    backgroundColor: "{colors.primary-fixed}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.sm}"
    padding: 10px
  button-secondary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-container}"
  chip-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 6px
  nav-item-active:
    backgroundColor: "{colors.surface-bright}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: 10px
  badge-success:
    backgroundColor: "{colors.tertiary-container}"
    textColor: "{colors.on-tertiary-fixed}"
    rounded: "{rounded.full}"
  badge-success-dim:
    backgroundColor: "{colors.tertiary-dim}"
    textColor: "{colors.on-tertiary-fixed}"
  badge-neutral:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
  badge-error:
    backgroundColor: "{colors.error-container}"
    textColor: "{colors.on-error-container}"
    rounded: "{rounded.full}"
  badge-error-soft:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
  stat-value:
    typography: "{typography.numeric}"
    textColor: "{colors.on-surface}"
  section-label:
    typography: "{typography.label}"
    textColor: "{colors.on-surface-variant}"
  light-shell:
    backgroundColor: "{colors.light-background}"
    textColor: "{colors.light-on-surface}"
  light-card:
    backgroundColor: "{colors.light-surface-container}"
    textColor: "{colors.light-on-surface}"
    rounded: "{rounded.md}"
    padding: 16px
  light-card-hover:
    backgroundColor: "{colors.light-surface-container-high}"
    textColor: "{colors.light-on-surface}"
  light-panel-raised:
    backgroundColor: "{colors.light-surface-container-low}"
    textColor: "{colors.light-on-surface}"
  light-divider:
    backgroundColor: "{colors.light-outline-variant}"
  light-button-primary:
    backgroundColor: "{colors.light-primary}"
    textColor: "{colors.light-background}"
    rounded: "{rounded.sm}"
    padding: 10px
  light-button-secondary:
    backgroundColor: "{colors.light-secondary}"
    textColor: "{colors.light-background}"
    rounded: "{rounded.sm}"
    padding: 10px
  light-badge-success:
    backgroundColor: "{colors.light-tertiary}"
    textColor: "{colors.light-background}"
    rounded: "{rounded.full}"
  light-label:
    typography: "{typography.label}"
    textColor: "{colors.light-on-surface-variant}"
---

## Overview

BookOracle is a personal library people sit with. The interface should feel like a
well-lit reading room: calm surfaces, one confident accent, and nothing competing
for attention with the book covers, which are the real content.

The palette is **Asset Forge's**, adopted deliberately and unchanged. KP's apps
should read as one product family, so a user moving between them should not be
able to tell where one design system ends and another begins. The previous
BookOracle theme was a warm brown/cream palette named `mybibliotheca` that the
app never actually applied, so it was invisible in production.

The identity is **"Reading Room"**: dark-first, violet-accented, quiet, generous
with space, and strictly free of decoration that carries no meaning.

## Colors

- **Primary (#ac8aff), "Lavender Ink":** the single interaction colour. Active
  navigation, primary buttons, links, focus rings. If it is not interactive, it is
  not lavender.
- **Surface ladder (#0a0e19 to #232c43):** structure comes from stacked surfaces,
  not from borders or drop shadows. The page is `surface`; a sidebar is one step
  up; a card is two. Depth increases with lightness, monotonically.
- **On-surface (#dee5ff):** body text. A cool near-white, never pure `#fff`,
  which would glare against the navy.
- **On-surface-variant (#a3aac5):** secondary text, metadata, placeholder copy,
  section labels. Still passes WCAG AA on every surface above.
- **Secondary (#2fd9f4), "Cool Cyan":** informational and secondary affordances
  only. Deliberately not a second call to action.
- **Tertiary (#edffdf), "Pale Mint":** affirmative status — finished, completed,
  on-shelf. Never used for primary actions.
- **Error (#fd6f85):** destructive and failure states.

The old UI's neon pink-to-purple gradient banners are removed. A gradient with no
meaning behind it makes every screen look loud, and it fights the cover art.

## Typography

**Space Grotesk** for display, headings, and numerals; **Inter** for body copy and
labels. Space Grotesk carries the technical-but-warm register across KP's apps, and
its tabular figures matter here: reading statistics are a core surface, and
columns of numbers must align. Body copy stays Inter for legibility at small sizes.

Section labels are uppercase, letter-spaced, and small. They are the only place
uppercase appears.

## Layout

A fixed sidebar (280px) and a content column that breathes: 32px of padding at
desktop, 16px on mobile. The spacing scale is 4/8/16/24/32/48.

Reading statistics and book grids are the two surfaces that must handle real
volume: 140+ books, and counts that go to thousands of pages. Grids are
responsive, and metric values use `numeric` with tabular figures so digits do not
jitter as they change.

## Elevation & Depth

Depth is expressed through the surface ladder, not shadows. Cards step up one
surface level. Interactive elements may lift by moving one step up the ladder on
hover, and that colour change is the affordance.

The one exception is focus: a 2px `primary` ring, offset 2px, always visible on
keyboard focus.

## Shapes

Radius scales with element size so corners feel consistent rather than uniform:
6px for fields and buttons, 10px for cards, 16px for panels, full for chips and
badges. Book covers keep their natural aspect ratio and take `md`.

## Components

`button-primary` is the only high-emphasis action on a screen. A page with two
lavender buttons has no primary action.

`nav-item-active` uses `surface-bright` rather than a lavender fill, so the single
lavender in the sidebar stays reserved for genuinely interactive text. The old UI
filled the active nav item with a saturated gradient, which read as a button.

`badge-success` marks finished books; `light-badge-success` is its light-theme
counterpart. Status is always paired with a label or icon, never signalled by
colour alone.

`panel-sunken` sits one step below the page surface and is used for empty and
disabled states.

## Do's and Don'ts

- **Do** stack surfaces to create depth, and let one accent colour carry the
  whole interface.
- **Do** pair every status colour with a label or icon so it survives greyscale
  and high-contrast modes.
- **Do** use real icons. The `Icon` component's emoji mode was the shipped
  default, and food/magnifying-glass emoji as interface chrome is the single
  clearest sign an app is not finished. Emoji remains available as an explicit
  preference, never as the default.
- **Do** show real data. A dashboard full of zeros should look intentional.
- **Don't** use gradients as decoration. No pink-to-purple banners.
- **Don't** use more than one high-emphasis button per screen.
- **Don't** use pure black as a page background; `surface` is `#0a0e19`.
- **Don't** introduce a colour outside this palette. Both themes are derived from
  Asset Forge's token set.
