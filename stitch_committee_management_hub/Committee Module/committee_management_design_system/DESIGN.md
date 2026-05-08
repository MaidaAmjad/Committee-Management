---
name: Committee Management Design System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  h1:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The brand personality is anchored in **Trust**, **Efficiency**, and **Clarity**. As a platform for committee management, the UI must facilitate high-stakes decision-making and administrative precision. The design style follows a **Modern Corporate** aesthetic—a refined evolution of SaaS patterns that prioritizes utility without sacrificing visual sophistication.

This design system utilizes a card-based architecture to organize complex information into digestible units. It leverages generous whitespace and a strict 8px grid to ensure the interface feels breathable and organized, reducing cognitive load for users managing dense agendas and minutes.

## Colors
The color palette is led by **Trust Blue (#2563EB)**, used strategically for primary actions and brand presence. The supporting palette utilizes **Slate Grays** to establish a sophisticated hierarchy of information.

- **Primary:** Trust Blue is the driver of interaction. Use the 600/700 shades for hover and active states to maintain high contrast.
- **Surface:** The background is a clean White (#FFFFFF), with Slate 50 used for subtle section differentiation.
- **Text:** Slate 900 for primary headings ensures maximum legibility, while Slate 600 is used for secondary body text.
- **Status:** High-saturation semantic colors (Success, Warning, Error) are used for badges and alerts to provide immediate visual feedback.

## Typography
**Inter** is the exclusive typeface for this design system. It was selected for its exceptional legibility in data-heavy environments and its neutral, professional tone.

- **Headlines:** Use tighter letter-spacing and heavier weights to create a strong visual anchor.
- **Body:** The default text size is 16px (body-md) to ensure accessibility across all age groups typically found in committee boards.
- **Labels:** Use "label-sm" with uppercase styling for table headers and small metadata tags to differentiate them from interactive text.

## Layout & Spacing
This design system employs a **Fixed-Fluid Hybrid Grid**. The main content area is capped at 1280px for optimal line lengths and readability, while the sidebar and navigation elements remain fixed. 

The rhythm is strictly based on an **8px grid**. All margins, paddings, and component heights must be multiples of 8. For high-density data views, the 4px (xs) increment may be used for internal component spacing (e.g., icon-to-text distance).

## Elevation & Depth
Depth is communicated through **Ambient Shadows** and **Tonal Layering**. We avoid heavy blacks in shadows, opting for soft, diffused Slate tints to maintain a minimal vibe.

- **Level 0 (Flat):** The main background (Slate 50).
- **Level 1 (Card):** White surfaces with a 1px border (Slate 200) and a subtle "Soft" shadow (Y: 2px, Blur: 4px, Opacity: 4% Slate 900).
- **Level 2 (Dropdowns/Modals):** Elevated surfaces with a more pronounced "Deep" shadow (Y: 10px, Blur: 20px, Opacity: 8% Slate 900) to indicate clear separation from the workspace.

## Shapes
The shape language is approachable yet structured. We use a **Rounded** philosophy to soften the corporate nature of the platform.

- **Standard (8px):** Used for inputs and smaller components.
- **Large (16px):** Used for primary content cards and containers.
- **Full (Pill):** Reserved exclusively for status badges and tags to distinguish them from interactive buttons.

## Components

### Buttons
Primary buttons use the Trust Blue 600 base with White text for high contrast. They feature a 12px corner radius and a subtle inner-glow on hover. Secondary buttons use a Slate 100 background with Slate 900 text to remain present but subordinate.

### Input Fields
Inputs are defined by a Slate 200 border and a 12px radius. The focus state is critical: a 1px solid Trust Blue 500 border with a 3px soft blue outer glow (box-shadow) to clearly indicate the active work area.

### Status Badges
Badges use a "Tinted-Vibrant" style: a very pale background (Semantic 50) with high-contrast text (Semantic 700). This ensures the status is readable without dominating the visual hierarchy.

### Cards
Cards are the primary container. They must always have a White background and a 16px corner radius. Padding inside cards should default to 24px (lg) to maintain the generous whitespace requirement.

### Specialized Components
- **Agenda Timeline:** A vertical stepper component using Trust Blue for completed items and Slate 200 for upcoming items.
- **Member Avatars:** Circular images with a 2px White border to ensure they pop against gray backgrounds.
- **Document Preview:** A specialized card variant with a Slate 50 header to signify a file attachment.