# Design System Specification: Editorial Authority

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Gavel."** In the premium legal SaaS space, design must function as a silent authority. It is not enough to be clean; the interface must feel inevitable, permanent, and meticulously curated. 

This system rejects the "template" look of modern web apps. We move beyond a standard grid by utilizing **Editorial Asymmetry**—where whitespace is treated as a structural element rather than "empty" space. By combining the obsessive precision of Apple’s hardware marketing with the functional intimacy of Apple Notes, we create an environment where high-density legal data feels breathable and decisive. We achieve this through layered surfaces, hairline precision, and a typography-first hierarchy.

---

## 2. Colors: Tonal Sovereignty
The palette is rooted in monochromatic restraint, punctuated by a singular "Legal Gold" to signify high-value actions.

### Surface Hierarchy & Nesting
To achieve a premium feel, we move away from flat planes. We treat the UI as a series of physical layers—stacked sheets of fine vellum.
- **Surface (Base):** `#FFFFFF` (The foundation).
- **Surface-Container-Low:** `#F5F5F7` (Secondary content, e.g., sidebars or meta-panels).
- **Surface-Container-Highest:** `#1D1D1F` (Reserved for the Global Navigation Sidebar).

### The "No-Line" Rule
Explicitly prohibit 1px solid borders for sectioning. Structural boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section sitting on a `surface` background provides all the separation the eye needs without the "visual noise" of lines.

### The "Glass & Gradient" Rule
Floating elements (Modals, Hover Menus) should utilize Glassmorphism. Use `#FFFFFF` with a 70% opacity and a `20px` backdrop-blur. This ensures the UI feels integrated and high-end, allowing the subtle shifts of the underlying content to bleed through. For primary CTAs, a subtle linear gradient from `primary` (`#785600`) to `primary-container` (`#986d00`) at a 135-degree angle provides a "satin" finish that flat hex codes cannot replicate.

---

## 3. Typography: The Voice of Law
Typography is our primary tool for authority. We use the SF Pro family to create a sense of systematic hardware-software integration.

*   **Display & Headline (SF Pro Display):** Set with a tight `-0.02em` tracking. This "letter-tightening" mimics high-end print magazines. Headlines use `on-surface` (`#1A1C1D`) to command attention.
*   **Body (SF Pro Text):** Optimized for long-form legal reading. We use a generous `1.6` line-height at `16px` to reduce eye strain during document review.
*   **Labels (SF Pro Rounded):** Used for metadata and status chips. The slight rounding provides a subtle "human" touch to an otherwise rigid, authoritative system.

The hierarchy is driven by contrast: bold, tight headings paired with light, spacious body copy creates an "Editorial" rhythm that guides the lawyer's eye naturally down the page.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are forbidden. We achieve depth through the **Layering Principle**.

*   **Layering:** Place a `surface-container-lowest` card on a `surface-container-low` background. This creates a "soft lift" that feels architectural rather than digital.
*   **Ambient Shadows:** For floating elements like pickers or popovers, use a "Tinted Ambient" shadow: `0px 10px 30px rgba(26, 28, 29, 0.04)`. The shadow is tinted with the `on-surface` color to mimic natural light diffraction.
*   **The "Ghost Border" Fallback:** If a container requires a border for accessibility (e.g., input fields), use a 0.5px hairline: `outline-variant` (`#D3C4AF`) at 20% opacity. Never use 100% opaque borders.

---

## 5. Components: Precision Primitives

### Buttons
- **Primary:** `primary` (`#785600`) background with a subtle gold gradient. 10px corner radius. White text.
- **Secondary:** Transparent background with a `0.5px` Ghost Border. 
- **Tertiary:** Pure text with `primary` color, no background, minimal padding.

### Input Fields
Avoid boxes. Use a `surface-container-low` background with a 0.5px hairline bottom border only. On focus, transition the background to `surface-container-lowest` and the bottom border to `primary`.

### Chips
8px radius. Use `SF Pro Rounded` for label text. Selection chips use `on-secondary-container` for the background with `on-secondary` text. 

### Cards & Lists
**Forbid the use of divider lines.** Separate list items using vertical whitespace (16px–24px) or a subtle hover state shift to `surface-container-high`. A card should be defined by its `12px` corner radius and a tonal shift, never a stroke.

### Sidebar
The Global Navigation Sidebar uses `inverse-surface` (`#1D1D1F`). Active states use a "Pill" background (`#2C2C2E`) with a 10px radius. This high-contrast zone acts as the "anchor" for the entire experience.

---

## 6. Do's and Don'ts

### Do
*   **Do** use 0.5px hairlines for high-density data tables to maintain a "scientific" feel.
*   **Do** utilize asymmetric margins (e.g., 80px left, 40px right) in document views to create an editorial layout.
*   **Do** allow at least 64px of padding between major sections to let the "Legal Gold" CTAs breathe.

### Don't
*   **Don't** use pure black (#000000) for text; use `#1D1D1F` to keep the interface feeling organic and expensive.
*   **Don't** use standard "Material" shadows; they look "cheap" and "app-like."
*   **Don't** use "Alert Red" for errors unless absolutely critical. Use a refined `error` (`#BA1A1A`) and pair it with high-contrast text for a sophisticated warning.