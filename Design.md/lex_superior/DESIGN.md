# Design System Document

## 1. Overview & Creative North Star: "The Academic Counsel"
This design system is built upon the North Star of **"The Academic Counsel."** It evolves the "Digital Jurist" aesthetic into a more robust, commanding presence. While still rooted in the authority of the legal world, this system shifts from silent whispers to the bold, crimson-bound volumes of a supreme law library.

We maintain high-end editorial standards but trade the "soft parchment" feel for a more energetic, decisive palette. By pairing the intellectual weight of **Newsreader** with the precision of **Manrope**, we create a layout that feels rigorous, active, and institutional. The experience is balanced—relying on classic structure and clear hierarchy to convey power.

---

## 2. Colors: Institutional Authority
The palette shifts from heritage navies to commanding reds and academic blues. We utilize a sophisticated range of oxblood tones and deep blues to establish an atmosphere of high-stakes decision-making.

### Core Palette
- **Primary (`#d44439`):** The "Counsel Crimson." Used for primary actions, critical alerts, and brand-defining headers. It represents the binding of a classic law text.
- **Background (`#877270`):** The "Warm Slate." A muted, stone-like neutral that provides a sophisticated backdrop, moving away from pure whites to a more grounded, architectural tone.
- **Accent/Tertiary (`#004099`):** The "Royal Ink." Used for high-value highlights, focus states, and decorative elements that require a stark contrast to the primary red.

### The "No-Line" Rule
Boundary definition remains structural rather than decorative. **1px solid borders are prohibited for sectioning.** Use:
1. **Background Shifts:** Placing surface-variant containers against the base background.
2. **Balanced Spacing:** Utilizing moderate, consistent whitespace (Spacing: 2) to define groupings.
3. **Tonal Transitions:** Using the shift between `neutral` and `secondary` values to indicate hierarchy.

### Textures & Effects
- **The Crimson Gradient:** For primary CTAs, use a subtle linear gradient from a deeper shade of primary (#8d0d0d) to the base primary (#d44439) at a 135-degree angle.
- **Polished Glass:** Use surface-container-lowest at 85% opacity with a `16px` backdrop-blur for interactive layers, creating a sense of "polished mahogany" or heavy glass.

---

## 3. Typography: The Editorial Scale
The system leverages the contrast between the traditional **Newsreader** serif and the modern **Manrope** sans-serif to bridge the gap between tradition and modern efficiency.

- **Display & Headlines (Newsreader):** Used for storytelling and major page titles. Bold weights convey the gravitas of a legal verdict.
- **Title & Body (Manrope):** Used for functional UI elements and data. Manrope’s geometric clarity ensures maximum readability within dense legal or technical contexts.
- **Label (Manrope):** Used for metadata. Set with tight, intentional sizing to mimic the "stamps" on institutional filing systems.

---

## 4. Elevation & Depth: Tonal Layering
We utilize **Tonal Layering** to create a sense of physical organization without relying on heavy shadows.

### The Layering Principle
Depth is achieved by stacking containers based on their surface values:
- **Base:** `surface` (derived from #877270)
- **Sections:** `surface-container-low` 
- **Interactive/Floating:** `surface-container-highest`

### Ambient Shadows
For floating elements, use a highly diffused **Institutional Shadow**:
- **Value:** `0px 12px 24px -8px`
- **Color:** `on-surface` at **6% opacity**.
This provides a subtle lift, suggesting the element is "resting" rather than hovering.

---

## 5. Components: Refined Primitives

### Buttons
- **Primary:** `#d44439` background, `on-primary` text. Radius: `1` (Subtle roundedness).
- **Secondary:** `secondary-container` background. No border. Text in `on-secondary-container`.
- **Tertiary (Ghost):** No background. Text in `primary`.

### Cards & Lists
- **Rule:** **No Divider Lines.** 
- Separate list items using the defined `spacing: 2` scale (normal density).
- Cards should appear "inset" by using a slightly darker or lighter surface tone than the base background.

### Input Fields
- **Style:** Minimalist. A bottom border of 1px using `outline-variant` in the resting state.
- **Focus State:** Bottom border transitions to `primary` (#d44439).

### Chips
- **Selection Chips:** Use `tertiary-container` (#004099 variants) to distinguish from primary actions.
- **Action Chips:** Use `secondary-container` with subtle rounded corners.

---

## 6. Do’s and Don’ts

### Do:
- **Use Red with Authority.** Use the primary crimson to draw the eye to the most important "judgment" or action on the page.
- **Maintain Balanced Spacing.** Use the level 2 spacing to ensure the UI feels professional and efficient—neither too cramped nor excessively airy.
- **Contrast Check.** Ensure the deep `tertiary` blue is legible when used alongside `secondary` tones.

### Don’t:
- **Don't use Pill Shapes.** The `roundedness: 1` constraint means corners should remain crisp and subtle.
- **Don't use Bright Violets.** Stick to the Crimson/Blue/Slate palette to maintain the institutional "Academic Counsel" feel.
- **Don't use standard digital shadows.** Keep the elevation low and the shadows diffused.
- **Don't use 100% opaque dividers.** If a break is needed, use a tonal shift or a very faint `outline-variant` line.