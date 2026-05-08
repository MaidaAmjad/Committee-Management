---
name: High-Security Admin System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d8d9e3'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3fd'
  surface-container: '#ecedf7'
  surface-container-high: '#e6e7f2'
  surface-container-highest: '#e1e2ec'
  on-surface: '#191b23'
  on-surface-variant: '#424754'
  inverse-surface: '#2e3038'
  inverse-on-surface: '#eff0fa'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005ac2'
  primary: '#0058be'
  on-primary: '#ffffff'
  primary-container: '#2170e4'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#924700'
  on-tertiary: '#ffffff'
  tertiary-container: '#b75b00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#f9f9ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ec'
typography:
  h1:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  h3:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 24px
  gutter: 16px
---

## Brand & Style

This design system is built on the principles of **Security, Precision, and Institutional Trust**. It adopts a **Corporate Modern** aesthetic that prioritizes clarity and information density without sacrificing visual breathing room. 

The visual language communicates authority through a "High-Definition" approach—using razor-sharp borders, meticulous alignment, and a restrained color palette. The goal is to reduce cognitive load for administrators managing sensitive data, ensuring that every interaction feels deliberate and every state change is highly visible. The atmosphere is quiet and functional, evoking the feeling of a secure, modern command center.

## Colors

The palette is strictly divided into three functional zones:

1.  **Surfaces:** Pure white (#FFFFFF) is used for the primary content area and cards to maximize contrast. Light Slate (#F8FAFC) provides a subtle backing for navigation and background regions, creating a clear physical separation between the "stage" and the "tools."
2.  **Actions:** The Brand Blue (#3B82F6) is reserved exclusively for primary interactive elements like buttons and active selection states. This ensures that even in data-heavy screens, the "next step" is immediately identifiable.
3.  **Data & Content:** High-security contexts require zero ambiguity. Deep Navy (#0F172A) and Slate (#1E293B) are used for all text and structural borders in data tables. This high-contrast ratio ensures legibility even under poor lighting or on lower-quality monitors.

Status colors (Success: Green, Warning: Amber, Danger: Red) should be used sparingly and always accompanied by an icon to ensure accessibility.

## Typography

The typography system utilizes **Inter** for its exceptional legibility and systematic feel. 

- **Scale:** We use a tight scale to maintain information density.
- **Weights:** Use Semibold (600) for headers to provide a strong visual anchor. Use Medium (500) for UI labels and interactive elements.
- **Data Clarity:** For system logs, IP addresses, or security keys, use a monospaced font (JetBrains Mono) to ensure character distinction (e.g., distinguishing '0' from 'O').
- **Contrast:** Primary content uses Navy (#0F172A), while secondary metadata uses Slate (#475569).

## Layout & Spacing

This design system employs a **Fixed-Fluid Hybrid** grid. The side navigation is fixed at 280px to provide a persistent "home" for the user, while the main content area fluidly expands to fill the remaining viewport.

- **The 4px Rule:** All spacing—padding, margins, and component heights—must be multiples of 4px.
- **Content Density:** In data tables, use "Compact" (8px vertical padding) and "Standard" (12px vertical padding) modes to accommodate different user preferences.
- **Alignment:** Use a 12-column grid for dashboard widgets, ensuring that gutters remain consistent at 16px to maintain the structural "skeleton" of the dashboard.

## Elevation & Depth

To maintain a secure and grounded feel, this design system avoids heavy shadows or floating elements. 

- **Tonal Layering:** Depth is primarily communicated through color. The background is #F8FAFC, and active modules/cards are #FFFFFF.
- **Borders over Shadows:** Instead of ambient shadows, use 1px solid borders (#E2E8F0) to define containers. This creates a more precise, "blueprint" feel.
- **Active Elevation:** Only use a very subtle, tight shadow (0px 1px 2px rgba(15, 23, 42, 0.05)) for elements that are truly interactive or temporarily appearing, such as dropdown menus or modals.
- **Logical Stacking:** Navigation lives on the base layer, while content lives on a slightly elevated white "card" layer.

## Shapes

The shape language is defined by the **Rounded-Eight** standard. This provides a professional balance—avoiding the clinical feel of sharp corners while remaining more serious than fully pill-shaped "playful" systems.

- **Standard Elements:** Buttons, Input Fields, and Cards use the default **8px** radius.
- **Small Elements:** Checkboxes, tags, and secondary small buttons use a **4px** radius.
- **Layout Containers:** Larger layout wrappers or main dashboard sections use a **12px** radius to soften the overall interface.

## Components

### Buttons
- **Primary:** Brand Blue (#3B82F6) with white text. No gradient. 8px radius.
- **Secondary:** White background with #E2E8F0 border and Navy text.
- **States:** Hover states should be 10% darker than the base color. Focus states must feature a 2px blue ring with a 2px white offset for high visibility.

### Data Tables
- **Header:** Light Slate (#F8FAFC) background, Navy (#0F172A) semibold text, bottom border 2px #E2E8F0.
- **Rows:** White background, 1px bottom border #F1F5F9. High-contrast Slate text.
- **Active Row:** A subtle 2px left-border of Brand Blue to indicate selection.

### Form Inputs
- **Idle:** 1px border (#E2E8F0), 8px radius.
- **Active/Focus:** 1px border Brand Blue with a soft blue outer glow.
- **Labels:** Always persistent, never floating, in Navy #0F172A (Medium weight).

### Cards & Modules
- White background, 1px solid border (#E2E8F0).
- Titles should be in H3 (18px) with a Slate icon to the left for visual scanning.

### Security Indicators
- **Verified Badge:** Small blue checkmark inside a 4px rounded square.
- **Status Chips:** High-contrast background (10% opacity of status color) with deep-colored text for maximum legibility (e.g., Dark Red text on Light Red background).