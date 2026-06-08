---
name: Warm Sunset
colors:
  surface: '#fcf9f2'
  surface-dim: '#dcdad3'
  surface-bright: '#fcf9f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ec'
  surface-container: '#f1eee7'
  surface-container-high: '#ebe8e1'
  surface-container-highest: '#e5e2db'
  on-surface: '#1c1c18'
  on-surface-variant: '#524439'
  inverse-surface: '#31312c'
  inverse-on-surface: '#f3f0e9'
  outline: '#847467'
  outline-variant: '#d6c3b4'
  surface-tint: '#885210'
  primary: '#885210'
  on-primary: '#ffffff'
  primary-container: '#c68642'
  on-primary-container: '#442500'
  inverse-primary: '#ffb870'
  secondary: '#825336'
  on-secondary: '#ffffff'
  secondary-container: '#fdbe9a'
  on-secondary-container: '#794b2f'
  tertiary: '#725a41'
  on-tertiary: '#ffffff'
  tertiary-container: '#ac8f73'
  on-tertiary-container: '#3c2914'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcbe'
  primary-fixed-dim: '#ffb870'
  on-primary-fixed: '#2c1600'
  on-primary-fixed-variant: '#693c00'
  secondary-fixed: '#ffdbc8'
  secondary-fixed-dim: '#f7b995'
  on-secondary-fixed: '#321200'
  on-secondary-fixed-variant: '#673c21'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#e1c1a2'
  on-tertiary-fixed: '#291805'
  on-tertiary-fixed-variant: '#59422b'
  background: '#fcf9f2'
  on-background: '#1c1c18'
  surface-variant: '#e5e2db'
  text-main: '#3C3C3C'
  text-light: '#707070'
  divider: '#E2DED0'
  surface-white: '#FFFFFF'
  overlay-glass: rgba(255, 255, 255, 0.9)
typography:
  display-h1:
    fontFamily: beVietnamPro
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -1px
  headline-h2:
    fontFamily: beVietnamPro
    fontSize: 36px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-h2-mobile:
    fontFamily: beVietnamPro
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  title-h3:
    fontFamily: beVietnamPro
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  nav-link:
    fontFamily: beVietnamPro
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.7'
  body-main:
    fontFamily: beVietnamPro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.8'
  body-sm:
    fontFamily: beVietnamPro
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.7'
  cta-label:
    fontFamily: beVietnamPro
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.5px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1000px
  section-gap-lg: 5rem
  section-gap-md: 4rem
  element-gap: 2rem
  nav-gap: 30px
  padding-button: 15px 35px
  padding-container-h: 20px
---

## Brand & Style

The design system is built upon the concept of "Natural Minimalism," specifically evoking the serene and restorative atmosphere of a sunset. It targets individuals seeking slow travel, mental healing, and a departure from the high-velocity digital world. The personality is grounded, calm, and emotive, prioritizing organic comfort over clinical precision.

The visual style is a blend of **Modern Minimalism** and **Tactile warmth**. It avoids the sterile coldness of pure white and blue-toned grays, instead utilizing a "Hanji" (traditional paper) inspired background and copper-toned accents. The aesthetic is defined by:
- **Organic Comfort:** Reducing eye strain through low-saturation earthy tones.
- **Structured Geometry:** Using clean, intentional lines and moderate rounding to maintain professional clarity without feeling "industrial."
- **Immersive Atmosphere:** Leveraging large-scale nature photography and generous whitespace to create a sense of physical space and "slow speed."

## Colors

The color palette is inspired by the "golden hour." The primary copper (`#C68642`) and secondary deep wood (`#8E5D3F`) tones provide warmth and hierarchy against the soft, off-white background (`#F4F1EA`).

- **Primary & Secondary:** Use these for brand identifiers, primary actions (CTAs), and emphasized headings.
- **Tertiary (Sepia):** Reserved for decorative accents, such as vertical borders or subtle highlights.
- **Neutral Background:** The `#F4F1EA` color should be the global page background to create a "paper-like" feel.
- **Text:** Primary reading text uses a softened charcoal (`#3C3C3C`) to maintain high legibility without the harsh contrast of pure black.
- **Surface:** Pure white (`#FFFFFF`) is used sparingly for cards and the header to provide a "lifted" feel against the warm background.

## Typography

This design system uses **Pretendard** (modeled here by Be Vietnam Pro for its friendly, approachable, yet contemporary feel) to ensure maximum legibility across all platforms. 

- **Hierarchy:** Dramatic scale shifts between H1 and body text emphasize the editorial, "travel log" nature of the content.
- **Readability:** Body text is set to a generous `1.8` line height to accommodate long-form reading and reduce cognitive load.
- **Spacing:** Negative letter spacing is applied to large display headers to keep them cohesive, while interactive labels use slight tracking for clarity.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy with a maximum width of 1000px to ensure line lengths remain optimal for reading. 

- **Vertical Rhythm:** Large gaps (4rem to 5rem) are used between major sections to allow the content to "breathe," mirroring the physical feeling of open nature.
- **Alignment:** Content is centered within the main container. 
- **Responsive Behavior:** 
    - **Desktop:** 12-column structure within the 1000px container.
    - **Mobile:** Single column with 20px horizontal margins. Spacing units should scale down by 25% on mobile devices to maintain density.

## Elevation & Depth

This design system uses **Tonal Layers** and **Warm Ambient Shadows** rather than standard gray elevations. 

- **The Ground Plane:** The background (`#F4F1EA`) is the lowest level.
- **Surface Elevation:** Cards and Navigation headers use white backgrounds to appear slightly elevated.
- **Shadow Character:** Shadows are tinted with the secondary warm color (`#8E5D3F`) to maintain color harmony. They should be highly diffused with low opacity (10-15%) to feel like natural, soft sunlight rather than artificial backlighting.
- **Glassmorphism:** The navigation bar uses a subtle backdrop blur with a 90% white overlay to maintain context of the content scrolling beneath it while ensuring text remains legible.

## Shapes

The shape language is "Softly Geometric." It rejects overly bubbly or circular aesthetics in favor of structured rectangles with softened edges.

- **Standard Radius:** 8px (0.5rem) for cards and containers to provide a modern, approachable feel.
- **Action Radius:** 4px (0.25rem) for CTA buttons and input fields to convey purpose, stability, and a "clean" look.
- **Accents:** Use hard-edged vertical lines (4px width) for decorative borders next to headings to ground the typography.

## Components

### Buttons
Primary buttons use the copper background with white text. They feature a 4px border radius and a 1px solid border of the secondary warm color. On hover, they lift slightly (`translateY(-3px)`) and the shadow deepens using a warm-toned tint.

### Input Fields
Inputs are strictly rectangular with a 4px radius. They use the `divider` color (`#E2DED0`) for borders and a soft white background. Focus states should transition the border color to the primary copper.

### Cards
Cards use a white surface (`#FFFFFF`) with an 8px radius. They should not have borders; instead, use a very soft, warm ambient shadow to separate them from the off-white background.

### Navigation
The navigation bar is sticky with a white 90% opacity background and a 1px `divider` bottom border. Links use the `nav-link` typography and transition to the primary copper color on hover.

### Decorative Accents
Article headings (H3) are often accompanied by a 4px solid left border in the `accent-sepia` (`#D9B99B`) color, creating a structured, editorial aesthetic.