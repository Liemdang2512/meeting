# Design System Strategy: The Intelligent Aura

## 1. Overview & Creative North Star

This design system is built to transform the mundane task of meeting documentation into a premium, curated experience. Our Creative North Star is **"The Digital Curator."**

Unlike standard "SaaS-blue" applications that rely on rigid grids and heavy borders, this system utilizes high-end editorial layouts. We break the "template" look through intentional asymmetry—using large-scale Manrope headlines offset against clean Inter body text—and a depth model based on light and transparency rather than lines. The result is an interface that feels less like a tool and more like an intelligent workspace that breathes, prioritizes, and anticipates user needs.

## 2. Colors

The color strategy focuses on a high-tech spectrum of deep navies and ethereal violets, moving away from flat "web colors" toward a sophisticated, multi-tonal palette.

### Tonal Application
* **Primary (`#4e45e4`) & Secondary (`#742fe5`):** These are our "Active Energy" tokens. They should be used for critical actions and AI-driven insights.
* **Surface Tiers:** Use the `surface-container` tokens to build depth.
* **Background:** `surface` (`#faf8ff`)
* **Lower Priority/Inset:** `surface-container-low` (`#f2f3ff`)
* **Higher Priority/Interactive:** `surface-container-highest` (`#d9e2ff`)

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or grouping content. Boundaries must be defined through:
1. **Background Color Shifts:** Placing a `surface-container-low` card on a `surface` background.
2. **Negative Space:** Utilizing the **Spacing Scale (8, 10, 12)** to create clear breathing room between content blocks.

### The "Glass & Gradient" Rule
To capture the "Gemini-inspired" high-tech vibe, floating panels (like command menus or AI summaries) should use **Glassmorphism**. Apply `surface-container-lowest` at 70% opacity with a `24px` backdrop-blur.

### Signature Textures
Main CTAs and Hero sections must utilize a **Signature Gradient**:
* `Linear-gradient(135deg, primary (#4e45e4) 0%, secondary (#742fe5) 100%)`.
* This adds "visual soul" and a sense of innovation that flat fills cannot replicate.

## 3. Typography

The system uses a dual-typeface approach to balance authority with readability.

* **Display & Headlines (Manrope):** A geometric sans-serif with a high-tech, modern personality. Use `display-lg` (3.5rem) and `headline-md` (1.75rem) to create editorial "anchors" on the page. Intentional asymmetry—such as left-aligning large headlines while centering content—creates a premium feel.
* **Body & Titles (Inter):** The workhorse. Inter provides maximum legibility for long-form meeting minutes. Use `body-lg` (1rem) for core content and `label-md` (0.75rem) for metadata.

The hierarchy is designed to guide the eye: Large Manrope headlines tell you *where* you are; clean Inter body text tells you *what* you need to know.

## 4. Elevation & Depth

We move beyond traditional drop shadows to a model of **Tonal Layering**.

### The Layering Principle
Hierarchy is achieved by stacking surface containers.
* **Level 0:** `surface` (Base canvas)
* **Level 1:** `surface-container-low` (Secondary content regions)
* **Level 2:** `surface-container-lowest` (Interactive cards/Active states)

### Ambient Shadows
When an element must "float" (e.g., a modal or floating action button), use **Ambient Shadows**:
* **Blur:** 32px to 48px.
* **Opacity:** 4% - 8%.
* **Color:** Use a tinted version of `on-surface` (`#213156`) to mimic natural light, avoiding "dirty" grey shadows.

### The "Ghost Border" Fallback
If accessibility requires a container edge, use a **Ghost Border**: `outline-variant` (`#a2b1dd`) at **15% opacity**. Never use 100% opaque borders.

## 5. Components

### Buttons
* **Primary:** Features the Signature Gradient (Primary to Secondary) with `full` roundedness. No border.
* **Secondary:** `surface-container-high` background with `primary` text. Use for secondary navigation.
* **States:** On hover, increase the gradient saturation; on press, scale the button to 98%.

### Cards & Lists
* **The Divider Ban:** Strictly forbid `
` or border-bottom dividers.

* **Separation:** Use a vertical space of `spacing.6` (1.5rem) or a shift to `surface-container-low`.
* **Corners:** Use `rounded-xl` (1.5rem) for main cards and `rounded-lg` (1rem) for nested elements.

### AI Transcription Chips
* **Visual Style:** Use `secondary-container` (`#eaddff`) with `on-secondary-container` text.
* **Interaction:** Subtle `primary` glow (4px blur) when the AI is actively processing that specific segment.

### Input Fields
* **Style:** `surface-container-lowest` fill, no border.
* **Focus:** Transition background to `surface-container-highest` and add a `2px` soft glow in `primary-dim`.

### Special Component: The "Minutes Pulse"
A custom component for MoMai representing active recording. A series of soft-blur circles using `primary-fixed` and `secondary-fixed` that pulse with `opacity` variations (0.2 to 0.6) to indicate AI listening.

## 6. Do's and Don'ts

### Do
* **DO** use white space as a structural element. If a layout feels crowded, increase spacing tokens rather than adding lines.
* **DO** use `surface-bright` for areas meant to catch the user’s eye first.
* **DO** ensure all text on gradients meets WCAG 2.1 contrast ratios using `on-primary` or `on-secondary` tokens.

### Don't
* **DON'T** use 90-degree corners. Everything in this system must feel approachable (minimum `rounded-md`).
* **DON'T** use pure black (`#000000`) for text. Always use `on-surface` (`#213156`) to maintain the deep blue tonal harmony.
* **DON'T** use high-contrast, heavy drop shadows. If a component looks like it's "floating" too high, reduce the opacity of the shadow, don't darken the color.