---
name: Kinetic Enterprise
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#464554'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#4f5f76'
  on-tertiary: '#ffffff'
  tertiary-container: '#68788f'
  on-tertiary-container: '#000510'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
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
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 32px
  gutter: 20px
---

## Brand & Style

The design system is engineered for a premium B2B SaaS environment, specifically multi-tenant partner portals and admission CRMs. The brand personality is **Precise, Reliable, and High-Performance**. It draws heavily from **Corporate Modernism** and **Minimalism**, prioritizing information density without sacrificing clarity.

The visual style utilizes a "Surface-First" approach:
- **High-Utility Minimalism:** Whitespace is used as a functional tool to separate complex data sets rather than just an aesthetic choice.
- **Precision Engineering:** Subtle 1px borders and micro-interactions provide a sense of technical excellence similar to high-end developer tools.
- **Contextual Clarity:** The interface remains neutral, allowing the data and status indicators to provide the necessary visual "energy."

## Colors

The palette is anchored by a neutral foundation to ensure longevity and professional appeal. 

- **Primary Accent:** Indigo (#6366F1) is reserved strictly for primary actions, active navigation states, and focus indicators.
- **Surface Hierarchy:** The background uses #FFFFFF for the main content areas (cards, tables) and #F9FAFB for the underlying application canvas to create subtle depth.
- **Typography Contrast:** We use #0F172A for maximum legibility in headings. Secondary metadata uses #64748B to create a clear information hierarchy.
- **Status Indicators:** Semantic colors are used with low-opacity backgrounds (10-15%) for badges and high-saturation icons to signal application states clearly without overwhelming the user.

## Typography

This design system utilizes **Inter** for all roles to maintain a systematic and utilitarian feel. 

- **Weight Scaling:** Use Semi-Bold (600) for headings and Medium (500) for interactive labels. Regular (400) is used for all body and descriptive text.
- **Letter Spacing:** Larger headings use a slight negative letter spacing (-0.01em to -0.02em) to appear tighter and more professional. Small labels use increased tracking (+0.05em) and uppercase styling for distinct categorization.
- **Vertical Rhythm:** A strict 4px baseline grid is used to determine line heights, ensuring perfectly aligned text rows in data-heavy tables.

## Layout & Spacing

The layout utilizes a **Fixed-Fluid Hybrid Grid**. Sidebars are fixed-width (240px or 280px), while the main content area fluidly scales with a maximum container width of 1440px to prevent excessive line lengths on ultra-wide monitors.

- **Grid:** 12-column system for desktop, 4-column for mobile.
- **Spacing Rhythm:** An 8px linear scale (4, 8, 16, 24, 32, 48, 64) is used for all padding and margins.
- **Mobile Adaptation:** On mobile devices, complex tables reflow into stacked card layouts. Navigation moves from a permanent sidebar to a bottom-anchored navigation bar or a full-screen drawer triggered from the top-left.
- **Density:** Provide two density modes: "Standard" (16px padding) for general portal use and "Compact" (8px padding) for power-user CRM views and data tables.

## Elevation & Depth

This design system uses a **Tonal Layering** approach combined with **Low-Contrast Outlines**. Depth is communicated through surface color changes and precise borders rather than heavy shadows.

- **Borders:** All containers, cards, and inputs use a 1px solid border (#E2E8F0).
- **Shadows:** Only used for floating elements (modals, dropdowns, popovers). Use a "Soft Diffused" style: `0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)`.
- **Active State:** Elements that are clicked or active may use a primary-colored ring (2px spread, 20% opacity) to indicate focus without shifting the layout.

## Shapes

The shape language is sophisticated and approachable.
- **Standard Corners:** Most UI components (Buttons, Inputs, Cards) use a **0.5rem (8px)** radius.
- **Large Containers:** Modals and main dashboard sections use **1rem (16px)** to create a distinct framing effect.
- **Interactive Micro-elements:** Checkboxes and radio buttons maintain a smaller 4px radius or full circle respectively to preserve their functional identity.

## Components

### Buttons & Inputs
- **Primary Button:** Solid #6366F1 background with white text. 8px corner radius.
- **Secondary Button:** White background with #E2E8F0 border and #0F172A text.
- **Input Fields:** 1px border (#E2E8F0). On focus, the border changes to #6366F1 with a 3px soft indigo outer glow.

### Status Badges
- **Visuals:** Pill-shaped with a background opacity of 10% of the semantic color and a text color of 100% of the semantic color. 
- **States:** Admitted (Green), Pending (Amber), Lost (Red), New (Blue).

### Tables (The Core CRM Element)
- **Header:** Light gray background (#F9FAFB), uppercase labels (Label-SM), 1px bottom border.
- **Rows:** White background, subtle hover state (#F8FAFC). Cell padding: 12px vertical, 16px horizontal.
- **Pagination:** Clean, text-based "Previous/Next" with numeric indicators.

### Cards
- Used for partner overview metrics and mobile-view records. Cards should have a 1px border (#E2E8F0) and no shadow when resting on the #F9FAFB canvas.

### Drawers
- Used for "Quick View" of applicant details. Slide in from the right, covering 40% of the screen on desktop, 90% on mobile. Includes a backdrop blur of 4px on the content beneath.