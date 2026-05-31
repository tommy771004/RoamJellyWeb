# RoamJelly Figma Auto-Layout & Design Ops Specification
**Document Version:** v3.4 (Handoff-Ready)  
**Author:** Figma Design Ops & Architecture Specialist  
**Design System Target:** RoamJelly Cross-Platform UI (Responsive Web & Mobile Companion)

---

## 1. Structural Boundaries & System Philosophy

RoamJelly's layout design maps to a **Desktop-First Precision with Mobile-First Implementation** strategy. The application operates primarily as:
1. **Desktop Web / tablet Viewport (Wide Workspace):** A 12-column grid configuration optimized for structural co-planning, flight route evaluation, and split-pane ledger tracking.
2. **Compact Viewport (iOS App Shell / Mobile Web):** A 4-column grid layout relying on gesture-driven interactions, nested auto-layout sheets, and touch-optimized bottom bars.

Consistent with **Apple Human Interface Guidelines (HIG)**, touch-targets are kept at a absolute minimum of **44 × 44 pt** on mobile, with spring transition animations providing reactive tactile feedback to the user's touch.

---

## 2. Design Tokens (The Color, Typography & Spatial Palette)

Figma design tokens are defined as global Variables (Figma Variables API) or Styles, matching Tailwind utility variables precisely for one-to-one developer handoff.

### 2.1 Color Tokens (Semantic Variable Map)

```
┌───────────────────────────┬──────────────┬───────────────────────────────┬───────────────────────────┐
│ Token Namespace           │ HEX Code     │ CSS Variable / Utility        │ WCAG 2.1 AA Contrast Ratio│
├───────────────────────────┼──────────────┼───────────────────────────────┼───────────────────────────┤
│ color/brand/primary       │ #0EA5E9      │ var(--color-sky-500)          │ 3.2:1 (Decorative/Border)  │
│ color/brand/secondary     │ #38BDF8      │ var(--color-sky-400)          │ 2.4:1 (Auxiliary indicator)│
│ color/brand/accent-cta    │ #F97316      │ var(--color-orange-500)       │ 4.8:1 (Action State Text) │
│ color/brand/accent-hover  │ #EA580C      │ var(--color-orange-600)       │ 5.1:1 (Action Hover State)│
│ color/bg/slate-main       │ #F0F9FF      │ var(--color-sky-50)           │ Background                │
│ color/text/slate-contrast │ #0C4A6E      │ var(--color-sky-950)          │ 9.6:1 (High-Accessibility)│
│ color/bg/dark-slate       │ #0F172A      │ var(--color-slate-900)        │ Background (Dark Mode)    │
│ color/text/dark-white     │ #F8FAFC      │ var(--color-slate-50)         │ 14.5:1 (High Dark Mode)   │
└───────────────────────────┴──────────────┴───────────────────────────────┴───────────────────────────┘
```

### 2.2 Typography Scale (Figma Text Styles)

All font styling implements **Inter** as the default fallback and modern **Space Grotesk** or **Outfit** for Display/Main headings, and **JetBrains Mono** for low-level numerical, currency, and timestamps data.

*   **font/display-large**
    *   *Family:* Space Grotesk (or Outfit)
    *   *Weight:* Bold (700) / Black (900)
    *   *Size:* 32 pt / 40px Line Height
    *   *Tracking:* -0.04em (Tighter kerning for display metrics)
*   **font/display-medium**
    *   *Family:* Space Grotesk
    *   *Weight:* Bold (700)
    *   *Size:* 22 pt / 28px Line Height
    *   *Tracking:* -0.03em
*   **font/body-semibold**
    *   *Family:* Inter
    *   *Weight:* Semibold (600)
    *   *Size:* 15 pt / 22px Line Height
    *   *Tracking:* -0.01em
*   **font/body-regular**
    *   *Family:* Inter
    *   *Weight:* Regular (400)
    *   *Size:* 14 pt / 20px Line Height
    *   *Tracking:* 0
*   **font/meta-mono**
    *   *Family:* JetBrains Mono
    *   *Weight:* Medium (500)
    *   *Size:* 12 pt / 16px Line Height
    *   *Tracking:* 0.05em (Expanded tracking for legibility of codes)

### 2.3 Spacing & Layout Grid Tokens

Strict adhere to the **8pt grid system**. Any element boundary padding must align to variables of 4 (for micro-adjustments) or 8 (for regional blocks).
*   `spacing/4` : 4 pt
*   `spacing/8` : 8 pt
*   `spacing/12` : 12 pt
*   `spacing/16` : 16 pt (Standard Component Gap)
*   `spacing/24` : 24 pt (Standard Card Inset / Regional Padding)
*   `spacing/32` : 32 pt (Page Margin / Sheet Padding)

---

## 3. Figma Responsive Frame Hierarchy & Grid Systems

### 3.1 Frame Structure & Baseline Grids

#### A. Widescreen Viewport Frame (Desktop Standard)
*   **Workspace Frame Dimensions:** 1440pt Width × Custom Height (Auto-expanding)
*   **Figma Layout Grid Settings:**
    *   *Columns:* 12
    *   *Type:* Stretch (Centered with margins)
    *   *Margin:* 80 pt
    *   *Gutter:* 24 pt
    *   *Vertical Grid:* Grid overlay of 8pt rows for baseline snap alignment.

#### B. Touch Compact Frame (iOS Viewport Standard)
*   **Workspace Frame Dimensions:** 390pt Width × 844pt Height (Standard iPhone 13/14/15/16 Base)
*   **Figma Layout Grid Settings:**
    *   *Columns:* 4
    *   *Type:* Stretch
    *   *Margin:* 16 pt (Safe structural inset)
    *   *Gutter:* 16 pt
    *   *Vertical Grid:* Explicit bottom safety offset bounds of 34pt to accommodate virtual Home Indicator.

---

## 4. Main Component Architecture Rules & Auto-Layout Specs

These Auto-layout specifications outline the precise nested structures required to convert Figma designs directly into production-grade Tailwind CSS flexbox assets.

### 4.1 Global Button Architecture (`component/button`)

#### Resizing Settings in Figma:
*   *Frame Type:* Root Auto-Layout Component Frame.
*   *Direction:* Horizontal (Left-to-Right)
*   *Padding - Horizontal:* 24 pt
*   *Padding - Vertical:* 14 pt
*   *Spacing between elements (Gap):* 8 pt
*   *Vertical Alignment:* Center Alignment
*   *Horizontal Resizing:* `Fill Container` (when embedded in lists) or `Hug Contents` (when floating)
*   *Vertical Resizing:* Fixed Height (56 pt / 48 pt variants)

#### Variant Schema & Properties:
```
Properties:
  - Type: Primary (Sky Gradient) | Secondary (Stroked) | Accent (Adventure Orange)
  - State: Default | Hover | Active | Disabled
  - Leading Icon: Boolean (True/False)
  - Trailing Icon: Boolean (True/False)
```

---

### 4.2 Auto-Layout Setup for the 8 Core Screens

### Screen 1: Discover & Search Deck (Home Tab)
An interface optimized for flight routes mapping. Handles multi-column layouts using stacked Auto-layouts.

#### Figma Frame Hierarchy:
```
[Frame Model: 1440 × 1024 Desktop Root] (Vertical Auto-Layout, Spacing: 32)
 ├── [Frame: Top Navigation Bar] (Horizontal Auto-Layout, Resizing: W-Fill, H-Fixed 72)
 ├── [Frame: Main Workspace Frame (Centered)] (Horizontal Auto-Layout, Resizing: W-Fill, H-Fill, Gap: 24)
 │    ├── [Frame: Left Search Deck Column] (Vertical Auto-Layout, Resizing: W-Fixed 420, H-Fill, Gap: 20)
 │    │    ├── [Card Component: Departure Selector] (Auto-Layout, Resizing: W-Fill, H-Hug)
 │    │    ├── [Card Component: Destination Selector] (Auto-Layout, Resizing: W-Fill, H-Hug)
 │    │    └── [Button Component: Find Optimal Routes] (Resizing: W-Fill, H-Fixed 56)
 │    └── [Frame: Right Price Tracking Panel] (Vertical Auto-Layout, Resizing: W-Fill, H-Fill, Gap: 20)
 │         ├── [Frame: Horizontal Navigation Segment Filter] (Resizing: W-Fill, H-Hug)
 │         └── [Grid Container: Discover Cards List] (Horizontal Wrapping Auto-layout, Resizing: W-Fill, H-Fill)
 └── [Frame: Bottom Footer Bar] (Horizontal Auto-Layout, Resizing: W-Fill, H-Fixed 64)
```

#### Responsive Constraints:
*   On Mobile viewports (width < 768px), `Main Workspace Frame` switches `Direction` properties from `Horizontal` to `Vertical`.
*   The `Left Search Deck Column` resizing property changes from `W-Fixed 420` to `W-Fill`.

---

### Screen 2: Flight Clickout & Handshake (Redirect Screen / Bottom Sheet)
A high-fidelity modal overlay built with glassmorphic depth to verify transactions transparently.

#### Figma Frame Hierarchy:
```
[Frame Model: 390 × 844 iOS Screen Container]
 ├── [Overlay: Modal Mask] (Resizing: W-Fill, H-Fill, Constraint: Left/Right Stretch, Top/Bottom Stretch)
 └── [Frame: Handshake Bottom Sheet] (Vertical Auto-Layout, Spacing: 24, Padding Scroll: L/R 32, Top 24, Bottom 40)
      ├── [Frame: iOS Drag Grabber Indicator] (Horizontal Align Center, Resizing: W-Fixed 40, H-Fixed 5)
      ├── [Frame: Icon & Title Header Block] (Vertical Auto-Layout, Spacing: 8, Resizing: W-Fill)
      ├── [Card: Booking Partner Details] (Vertical Auto-Layout, Padding: 16, Spacing: 12, Resizing: W-Fill)
      └── [Frame: Button Actions Rail] (Horizontal Auto-Layout, Spacing: 12, Resizing: W-Fill)
           ├── [Button: Proceed (Accent Primary)] (Resizing: W-Fill, H-Fixed 56)
           └── [Button: Return (Ghost Stroke)] (Resizing: W-Fill, H-Fixed 56)
```

#### Figma Auto-Layout Constraints:
*   **Sheet Position:** Constraint set to Bottom-Stretch.
*   **Self-Resizing:** Horizon Resizing `Fill Container`, Vertical Resizing `Hug Contents` (Adapts dynamically to the flight choice details height).

---

### Screen 3: AI Co-planner Form (`component/ai-form-sheet`)
Captures preferences such as region routes, diet, budget, and travel companion styles.

#### Figma Auto-Layout Structure:
```
[Frame Component: AI Form Container] (Vertical Auto-Layout, Padding: 24, Gap: 20, Resizing: W-Fill, H-Hug)
 ├── [Frame: Step Title Block] (Vertical, Spacing: 4)
 ├── [Frame: Departure/Arrival Input Fields] (Horizontal, Spacing: 12, Resizing: W-Fill)
 ├── [Group Flex Component: Vibe Chip Selector] (Horizontal Wrapping, Gap: 10, Resizing: W-Fill)
 │    ├── [Component: Pill Button (Amber Variant)]
 │    └── [Component: Pill Button (Amber Variant)] ...
 └── [Frame: Budget Segment Bar] (Horizontal, Spacing: 8, Padding: 4, Resizing: W-Fill)
```

---

### Screen 4: Invitation Landing Board (TripLandingPage)
Onboards participants through smooth onboarding cards, previewing shared itineraries.

#### Figma Frame Hierarchy:
```
[Frame Model: 390 × 844 Frame Viewport] (Vertical Layout, Align: Center, Space Between)
 ├── [Header Block: Title & Badge Graphic] (Vertical, Spacing: 16, Top Padding: 64)
 ├── [Card Block: Invitation Details Slate] (Vertical Auto-Layout, Padding: 24, Spacing: 16, Resizing: W-Fill, Constraint: Center)
 │    ├── [Frame: Trip Organizer Avatar Group] (Horizontal Box, Spacing: 8)
 │    ├── [Text Label: Trip Name & Meta Dates] (Resizing: W-Fill)
 │    └── [Divider Rule: Slate Line] (Resizing: W-Fill, H-Fixed 1)
 └── [Frame: Sticky Double Button Group] (Vertical Auto-Layout, Padding: 16, Bottom Padding: 34, Resizing: W-Fill)
```

---

### Screen 5: Itinerary Workplace Map-Split Screen (ItineraryTab)
Dual-pane workflow coordinate space mapping itinerary schedules with high spatial densities.

#### Figma Frame Hierarchy:
```
[Frame Model: 1440 × 1024 Root Split] (Horizontal Auto-Layout, Resizing: W-Fill, H-Fill, Gap: 0)
 ├── [Pane: Left Itinerary Timeline Grid] (Vertical Auto-Layout, Resizing: W-Fixed 480, H-Fill)
 │    ├── [Frame: Floating Title & Header actions Header] (H-Fixed 80, Resizing: W-Fill)
 │    └── [Frame: Timeline Sequence Infinite Scroll] (Vertical Auto-Layout, Scroll-Vertical: Enabled, Resizing: W-Fill, H-Fill)
 │         ├── [Card Component: Chrono Day Node Splitter]
 │         └── [Card Component: Itinerary Node Card]
 └── [Pane: Right Map Surface View] (Resizing: W-Fill, H-Fill)
```

---

### Screen 6: Checklist Hub Tool Console (ToolsTab > Checklist)
Organizes task states to complete multi-user preparation items cleanly.

#### Figma Auto-Layout Setup:
*   **Checklist Item Frame:** Vertical Auto-Layout wrapper `W-Fill`, containing checklist items.
*   **Target List Auto-layout:**
    *   *Direction:* Horizontal
    *   *Resizing:* Horizontal `Fill Container`, Vertical `Hug Contents`
    *   *Alignments:* Align Middle Center
    *   *Inner Spacing Gap:* 12 pt
*   **Check Box Target Size:** Fixed frame size `24 × 24 pt` with 4pt outer hit area expansion, styled with a clean `Border-Radius: 8px`.

---

### Screen 7: Dynamic Budget Settlement Ledger Panel (ToolsTab > Ledger)
The ledger calculates aggregate payouts, split distributions, and accounts for division remainders smoothly.

#### Figma Auto-Layout Specs:
```
[Card Component: Ledger Board Container] (Vertical Auto-Layout, Padding: 20, Spacing: 16, Resizing: W-Fill, H-Hug)
 ├── [Frame: Input Form Ledger Entry] (Horizontal Auto-Layout, Spacing: 12, Resizing: W-Fill)
 │    ├── [Input: Expense Label] (Resizing: W-Fill)
 │    └── [Input: Amount Selection Value] (Resizing: W-Fixed 120)
 ├── [Frame: Multi-user Collaborator Splits Checklist] (Horizontal Wrapping Rail, Gap: 8)
 └── [List Box: Net Settlement Targets] (Vertical Auto-Layout, Spacing: 8, Resizing: W-Fill)
      ├── [Line Component: Settlement Transaction Item]
      └── [Line Component: Settlement Transaction Item]
```

---

### Screen 8: Multi-user Profile Board Modal (UserProfileModal)
The multi-user panel that configures personal preferences (Vibes, Diet, Transport, Actions) and hosts notifications under interactive tab selectors.

#### Figma Auto-Layout Structure (Handoff Compliant):
```
[Frame Component: User Profile Modal Deck] (Vertical Auto-Layout, Border-Radius: 32, Max-Height: 85vh)
 ├── [Header Area] (Horizontal Auto-Layout, Padding: 20, Align: Space-Between, Resizing: W-Fill, H-Fixed 72)
 ├── [Segmented iOS Control Bar] (Horizontal Auto-Layout, Padding: 16 (H) 8 (V), Resizing: W-Fill, H-Hug)
 ├── [Scroll Content Container] (Vertical Scroll Scrollable Frame, Padding: 24, Space-Between sections: 20, Resizing: W-Fill, H-Fill)
 │    ├── [Grid Section: Profile Form Input Fields] (Horizontal, Spacing: 16, Resizing: W-Fill)
 │    ├── [Pill Rail Frame: Vibes Selectors] (Horizontal Flex Wrap, Gap: 10, Resizing: W-Fill)
 │    └── [Pill Rail Frame: Interests Selectors] (Horizontal Flex Wrap, Gap: 10, Resizing: W-Fill)
 └── [Sticky Bottom Control Footer] (Horizontal Auto-Layout, Border-t, Padding: 20, Resizing: W-Fill, H-Fixed 80)
```

---

## 5. Interaction Prototypes & Physics Token System

Figma transition settings use precise timing patterns designed to mimic Apple's interactive fluid motion mechanics.

### 5.1 Animation Curve Tokens

*   **phys/spring-snappy (Figma Custom Spring)**
    *   *Figma Settings:* Spring (Stiffness: 300, Damping: 25, Mass: 1.0)
    *   *Best Suited for:* Toggles, Button Clicks, Pill Selections, Tabs transitions.
*   **phys/spring-ease (Figma Fluid Spring)**
    *   *Figma Settings:* Spring (Stiffness: 210, Damping: 20, Mass: 1.0)
    *   *Best Suited for:* Bottom Sheet slide-ups, Itinerary Card reorganization, Modal Overlays fading.

### 5.2 Micro-Interaction Schema

```
┌──────────────────────────┬─────────────────┬───────────────────┬──────────────────────────────────────────┐
│ Selector Target          │ Trigger         │ Animation Option  │ Behavior Spec                            │
├──────────────────────────┼─────────────────┼───────────────────┼──────────────────────────────────────────┤
│ clickout/card-trigger    │ On Click        │ phys/spring-ease  │ Sheet slides vertically overlay on screen│
│ navigation/tab-button   │ On Press (Down) │ -2% scale shrink  │ Tactile structural scale feedback        │
│ system/pill-chip         │ On Click        │ phys/spring-snappy│ Instantly inflates +3% scale with border │
│ itinerary/node-card      │ On Drag (Left)  │ Smart Animate     │ Action sliding drawer reveals underneath │
└──────────────────────────┴─────────────────┴───────────────────┴──────────────────────────────────────────┘
```

---

## 6. CSS Code Handoff Specifications (Tailwind Reference)

For easy engineering translation, Figma's design variables map directly to custom classes and theme properties inside the application:

### 6.1 Tailwind Configuration Theme Extends
```typescript
// tailwind.config.ts reference map
export const theme = {
  extend: {
    colors: {
      brand: {
        primary: "#0EA5E9",   // Sky 500
        secondary: "#38BDF8", // Sky 400
        accent: "#F97316",    // Orange 500
        dark: "#0F172A",      // Slate 900
      },
    },
    spacing: {
      "4px-inset": "4px",
      "8px-inset": "8px",
      "12px-inset": "12px",
      "16px-inset": "16px",
      "24px-inset": "24px",
      "32px-inset": "32px",
    },
    animation: {
      "spring-snappy": "cubic-bezier(0.34, 1.56, 0.64, 1) 300ms both",
      "spring-ease": "cubic-bezier(0.16, 1, 0.3, 1) 400ms both",
    }
  }
}
```

### 6.2 Component Code Layout Translators (Auto-Layout to HTML Class conversion)

*   **Figma Horizontal Auto-Layout (Left Aligned, Space-Between):**
    `flex flex-row items-center justify-between`
*   **Figma Vertical Auto-Layout (Top Aligned, Hug Heights):**
    `flex flex-col items-start justify-start h-fit`
*   **Figma Auto-Layout Padding H:24 / V:12:**
    `px-[24px] py-[12px]`
*   **Figma Auto-Layout Fill Container Width / Hug Contents Height:**
    `w-full h-auto`

---

## 7. Accessibility & Universal Design Benchmarks (WCAG 2.1 AA)

To satisfy **Universal Accessibility (WCAG 2.1 AA)** and **Apple iOS accessibility norms**, follow these specific layout directives in both Figma and output code:

1.  **Strict Color Contrast Enforcement:** Colors must meet a 4.5:1 contrast ratio for regular body text (`Inter 14pt`) and a minimum of 3.0:1 for large display titles (`Space Grotesk 22pt+`) against surrounding slate gradients. 
2.  **Explicit Focus Outline Rings:** In high-contrast or light canvas views, interactive input decks must express highly noticeable focus outline indicators utilizing `focus-visible:ring-4 focus-visible:ring-sky-400/30` or similar visual markers.
3.  **Non-Chromatic Visual Cues:** Error validation states must not rely exclusively on hue shifts (e.g., turning a label red). An auxiliary icon (like a warning triangle) and explicit supportive micro-text must accompany the action.
4.  **Touch Target Expansion Rule:** Any compact touch element (such as delete icons, cross-dismissals for cards, and checklist items) must expand their invisible clickable target boundaries to a minimum of **44 × 44 pt** via padding to prevent touch alignment friction in mobile environments.
