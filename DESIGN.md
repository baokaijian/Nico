---
version: alpha
name: Apple-Minimalist-Swimming
description: Apple design system principles with high-contrast slate colors, frosted glass interfaces, and clean typography.
colors:
  primary: "#1d1d1f"
  secondary: "#86868b"
  accent: "#0071e3"
  accent-hover: "#0077ed"
  background-light: "#f5f5f7"
  background-dark: "#000000"
  card-bg: "rgba(255, 255, 255, 0.72)"
  card-border: "rgba(0, 0, 0, 0.08)"
  shadow-color: "rgba(0, 0, 0, 0.04)"
typography:
  fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
  h1:
    fontSize: 2.5rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.021em"
  h2:
    fontSize: 1.75rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.011em"
  body:
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.007em"
rounded:
  sm: 8px
  md: 12px
  lg: 20px
  round: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
---

# Design System: Apple Minimalist

## 1. Overview
The visual system is designed to look clean, polished, and premium—drawing inspiration from Apple's operating systems (iOS and macOS). It features clean grids, generous whitespace, card structures, and frosted glass (glassmorphism) elements that allow backgrounds to subtly bleed through.

## 2. Color System
- **Backgrounds:** Clean off-white `#f5f5f7` for light mode to create structure without being blindingly bright.
- **Text:** Slate black `#1d1d1f` for strong readability, slate grey `#86868b` for secondary labels, metadata, and hints.
- **Accents:** High-fidelity Apple blue `#0071e3` to draw attention to primary call-to-actions, toggles, and metrics.
- **Cards:** White translucent base `rgba(255, 255, 255, 0.72)` combined with a thin border `rgba(0, 0, 0, 0.08)` and back-drop blur filters.

## 3. Typography
Use system-native fonts (`-apple-system`, `BlinkMacSystemFont`) to feel integrated with the user's OS. Avoid heavy decoration, let the font weights and sizes establish clear reading order.

## 4. Components & Glassmorphism
- **Cards:** All content sections must be enclosed in rounded glass cards.
- **Blurs:** Use `backdrop-filter: blur(20px)` on card structures.
- **Form Inputs:** Soft, light gray inputs with a subtle inner border, which glow blue on focus.
- **Buttons:**
  - Primary: Filled blue with white text.
  - Secondary: Soft grey background with blue or charcoal text.

## 5. Micro-Animations
- Hover states must use smooth transitions (`transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)`).
- Cards should lift slightly (`transform: translateY(-2px)`) on hover.
- Modal dialogs should animate upwards from the bottom of the screen with a scaling effect.
