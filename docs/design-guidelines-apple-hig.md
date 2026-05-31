# RoamJelly UI/UX Design Specification: Apple HIG and Cross-Platform Adaptation

This document defines the comprehensive UI/UX architecture for RoamJelly. It aligns with Apple Human Interface Guidelines (HIG), Web Content Accessibility Guidelines (WCAG 2.1 AA), and requirements for both mobile (iOS) and desktop (macOS / Web) environments.

---

## 1. Product Brand & Persona Definition

### 1.1 Persona Analysis

#### Persona A: The Coordination Optimizer (Group Organizer)
* Role: Primary Trip Architect.
* Needs: High-density layouts, fast batch inputs, spreadsheet-grade multi-currency splitting ledger, real-time sync transparency, and precise mapping coordination.
* Platform Preference: Initial scaffolding on Desktop/Web (large viewport), operational updates via Mobile (companion mode).

#### Persona B: The Collaborative Companion (Group Participant)
* Role: Spontaneous Co-planner.
* Needs: Frictionless onboarding through simple deep-links, instant collaborative editing with role indicators, clear offline status, and simplified gesture controls.
* Platform Preference: Mobile (iOS web wrapper or mobile web), requiring touch target sizes of at least 44pt.

#### Persona C: The Cost-Sensitive Explorer
* Role: Flight Comparison Analyst.
* Needs: Transparent affiliate redirection verification, high-scannability pricing indices, and persistent tracking controls for fare fluctuations.
* Platform Preference: Mixed mobile notifications and desktop side-by-side comparison tables.

### 1.2 Aesthetic Identity (RoamJelly Theme)
* Primary Mood: Inspirational, high-fidelity collaboration, architectural logic. Employs crisp light modes with soft glassmorphism overlays, alternating with dark cosmic high-contrast palettes for late-night editing sessions.
* Color Specification:
  * Primary: #0EA5E9 (Sky Blue) representing expansion and open-air travel.
  * Secondary: #38BDF8 (Light Blue) for auxiliary states and indicators.
  * CTA Accent: #F97316 (Adventure Orange) targeting functional conversions and primary triggers.
  * Background: #F0F9FF (Tinted Soft Blue) to reduce chromatic fatigue.
  * Text Contrast: #0C4A6E (Deep Navy) for crisp legibility (exceeding WCAG AA 4.5:1 ratio).

---

## 2. HIG Navigation & Gesture Framework

### 2.1 Viewport Breakpoints & Spatial Adaptations

| Screen Width | Classification | Platform Target | Navigation Pattern |
|--------------|----------------|-----------------|--------------------|
| Under 768px  | Compact        | Mobile (iOS)    | Solid Bottom Tab Bar, Bottom Sheets, Gestures |
| 768px-1024px | Medium         | Tablet (iPadOS) | Left Rail Navigation, Split View Controllers |
| Over 1024px  | Wide           | Desktop/Web     | Left Sidebar + Center Workspace + Right Map Drawer |

### 2.2 Navigation Hierarchy
* Primary Level: Tab-based structure separating Discovery, Planing Workspace, and Travel Toolkits.
* Secondary Level: Modal Sheets (presented from bottom on mobile, centered dialog overlay on desktop) for focused transactional inputs.
* Contextual Level: Persistent inspectors for node details or map-coordinate editing.

### 2.3 Gesture Mapping (iOS Specifics)
* Swipe Left on Node: Reveals destructive actions (Delete, Remove Collaborator) with spring feedback.
* Pull-Down Workspace: Initiates global synchronization across WebSocket layers (Pull-to-Sync).
* Drag and Drop: Restructures scheduling sequence of itinerary cards with physical sorting physics (Zustand layout state re-allocation).
* Pinch-to-Inspect: Zooms on maps or attachment carousels inside modal spaces.

---

## 3. Core Component Layouts

### 3.1 Button Token Specifications
* Main Action: Minimum height 48pt, rounded corners (Border Radius: 12px), background CTA Orange. Text style Semibold, tracked tightly. Safe tap area expanded to 44pt padding minimum on touch surfaces.
* Interactive Press States: Scale shrinks to 0.97 dynamically on active press using spring motion tokens (duration: 300ms, responsiveness: 0.15).
* Disabled Indicator: Solid opacity reduction (40 percent), disabling cursor active states, maintaining WCAG-compliant boundary outlines.

---

## 4. Eight Core Screen Layouts

### Screen 1: Discover & Search Deck (Home Tab)
Designed for low-friction flight exploration and destination routing, adapting from single-column scroll card layout on iOS to split search dashboard on Desktop.

#### ASCII Wireframe Layout (Desktop Viewport)
```
+---------------------------------------------------------------------------------+
| ROAMJELLY                                                      [Dev Guest Token]|
+---------------------------------------------------------------------------------+
| REGION TABS   [ Asia ] [ Europe ] [ Americas ]                                  |
| +------------------------------------+  +-------------------------------------+ |
| | Flight Search Deck                 |  | Price Alerts Tracker                | |
| |                                    |  |                                     | |
| | Departure: [ TPE                ]  |  | [X] Tracks price for FUK - Jun 2026 | |
| | Destination: [ FUK              ]  |  |     Target price: Under 12000 TWD   | |
| | Departure Date: [ 2026-06-15    ]  |  |                                     | |
| |                                    |  | [Button: Create Custom Alert]       | |
| | [Button: Find Optimal Routes]      |  |                                     | |
| +------------------------------------+  +-------------------------------------+ |
+---------------------------------------------------------------------------------+
| DISCOVER CARDS (Horizontal Scroll Rail)                                         |
| +-------------------+  +-------------------+  +-------------------+             |
| | Fukuoka, Japan    |  | Tokyo, Japan      |  | Seoul, Korea      |             |
| | Standard Fare: TPE|  | Standard Fare: TPE|  | Standard Fare: TPE|             |
| | [Button: Compare] |  | [Button: Compare] |  | [Button: Compare] |             |
| +-------------------+  +-------------------+  +-------------------+             |
+---------------------------------------------------------------------------------+
```

* Adaptive Behavior: On mobile, the Flight Search Deck and Price Alerts stack vertically. The Region Tabs convert into a persistent segmented horizontal pill control.
* Accessibility Rules: Input fields are explicitly tied matching HTML label elements. Keyboard focusing implements outline rings in Primary Blue. Price thresholds support screen-reader readings of standard fare ranges.

---

### Screen 2: Flight Clickout & Handshake (Redirect Screen)
Transparent transition interface establishing affiliate accountability, complying with safety protocols.

#### ASCII Wireframe Layout (iOS Bottom Sheet)
```
+---------------------------------------------------------+
|                                                         |
|                  Affiliate Link Out                     |
|                                                         |
|  You are transitioning to our external booking partner: |
|                     Partner OTA                         |
|                                                         |
|  -----------------------------------------------------  |
|  * Flight Path: TPE - FUK (June 15, 2026)               |
|  * Fare Match Selection: NT$ 10,850                     |
|  -----------------------------------------------------  |
|                                                         |
|  Safety Guarantee: All bookings remain encrypted under  |
|  partner agency policies. Clickout logged for support.  |
|                                                         |
|  [Button: Proceed to Booking Partner (CTA Orange)]      |
|                                                         |
|  [Button: Decline and Return to Sea Deck (Sky Border)]  |
|                                                         |
+---------------------------------------------------------+
```

* Interaction Flow: Triggered by user selecting a flight card. Displays details clearly over blurred glassmorphic overlay. Redirect tracking API executes asynchronously background-first.
* Error State Safeguards: If network timeout blocks affiliate tracking confirmation, UI falls back gracefully to secondary raw browser clickout window.

---

### Screen 3: AI Co-planner Form (AiForm)
Captures complex coordination constraints (Budget, Vibes, Companions) dynamically to construct collaborative schedule scopes.

#### ASCII Wireframe Layout (Tablet Split View)
```
+---------------------------------------------------------------------------------+
| AI Trip Generation Blueprint                                                    |
+---------------------------------------------------------------------------------+
| Core Directives                        | Style Preferences                      |
| Destination Area: [ Kyoto, JP        ]  | Select Mood Tone:                      |
| Duration Total:   [ 5 Days           ]  | ( ) Luxury Eco-lodge                   |
| Start Location:   [ TPE              ]  | (X) Local Culinary & High Density Walking|
|                                        | ( ) Arts & Architectural Curations    |
| Companions Option:                     |                                        |
| ( ) Solo Travelers   (X) Family Group   | Budget Class:                          |
|                                        | [ Low   ] [X Moderate ] [ Premium    ]  |
| Special Accommodations:                |                                        |
| [X] Quiet locations for elderly        | Diet Restrictions:                     |
| [ ] Wheelchair accessible nodes        | [ Vegetarian (No Eggs)               ] |
|                                        |                                        |
| [Button: Authorize AI Generation Draft (Adventure Orange)]                      |
+---------------------------------------------------------------------------------+
```

* Micro-interactions: Active checkbox transitions employ Spring Snappy curves, expanding visual scales by 3 percent on toggle.
* Accessibility Adaptations: Generous text forms with font sizes scaling seamlessly with Dynamic Type sizes from Large up to Extra Large.

---

### Screen 4: Invitation Landing Board (TripLandingPage)
Core entryway for group members joining via shared link invitations, managing user role bounds securely.

#### ASCII Wireframe Layout (iOS Viewport)
```
+---------------------------------------------------------+
|                       JOINT TRIP                        |
+---------------------------------------------------------+
|                                                         |
|   You are invited to join:                              |
|   KYOTO SUMMER FAMILY FESTIVAL 2026                     |
|                                                         |
|   Trip Organizer: Tommy                                 |
|   Active Members: 4 Editors (Online)                    |
|                                                         |
|   Authorized Role Assigned:                             |
|   [ Editor Level ]                                      |
|   - Edit Itinerary Cards                                |
|   - Clear Shared Checklist Entries                      |
|   - Split and Assign Ledger Expenses                    |
|                                                         |
|   [Button: Register and Sync (Primary Sky Blue)]        |
|                                                         |
|   [Button: Anonymous Guest Preview]                     |
|                                                         |
+---------------------------------------------------------+
```

* Security Constraints: Explicitly highlights database privilege capabilities connected to the assigned token parameters before joining operations.

---

### Screen 5: Shared Multi-user Collaborative Board (Itinerary Workspace)
The core collaborative scheduling view showing sequential day-by-day scheduling cards mapped alongside interactive visual routes.

#### ASCII Wireframe Layout (Wide Desktop Desktop View)
```
+---------------------------------------------------------------------------------+
| Navigation Bar [Discover Tab] [Editing Board (Active)] [Ledger Suite]           |
+---------------------------------------------------------------------------------+
| TRIP: KYOTO FESTIVAL   Members: [Tommy (E)] [Yuri (E)] [Guest (V)]              |
+---------------------------------------------------------------------------------+
| LEFT NAVIGATION PANEL                  | CENTRAL MAIN WORKSPACE (DAY SCHEDULE) |
| [ Day 1: Arrival ]                     | Active View: Day 2 - Temples Exploration|
| [X Day 2: Historic Sites Exploration ]  |                                        |
| [ Day 3: Mountain Trails & Culinary ] | [Card: 09:30 Fushimi Inari Shrine]     |
| [ Day 4: Bullet Train Return ]         | - Intensity: Heavy Walking             |
|                                        | - AI note: Recommended early morning  |
| +------------------------------------+ |                                        |
| | MAP MINI DRAWER (Toggle Switch)    | | [Card: 12:00 Nishiki Market Lunch]     |
| |              [MAP]                 | | - Distance from shrine: 4.8 km        |
| |           [Point A]                | | - Transport link: Subway Line (18 min)|
| |               \                    | |                                        |
| |                \                   | | [Button: Append Schedule Node]         |
| |               [Point B]            | |                                        |
| +------------------------------------+ +----------------------------------------+
```

* Sync States Management: Bottom-sheet notifications slide into place representing collaborator adjustments: "Yuri added Kiyomizudera card."
* Offline Transition Handling: If connection drops, red banner warns: "Offline Mode active. Storing edits locally on this client."

---

### Screen 6: Multi-Currency Expense Ledger (Ledger Tools tab)
Aggregated split expense entry workspace supporting currency conversion, and residual calculations matching accuracy specs.

#### ASCII Wireframe Layout (iOS Compact View)
```
+---------------------------------------------------------+
|                     LEDGER SYSTEM                       |
+---------------------------------------------------------+
|                                                         |
|  Active Ledger: KYOTO FESTIVAL 2026                     |
|  Target Currency Options: [ TWD ] [ JPD ] [ USD ]       |
|                                                         |
|  Add Shared Expense Input:                              |
|  - Description: [ Fushimi Amusements Fee         ]      |
|  - Amount Spent: [ 12000          ] [ JPY ]             |
|  - Payer: [ Tommy (E)           ]                       |
|  - Splitting Group:                                     |
|    [X] Tommy   [X] Yuri   [X] Guest                     |
|                                                         |
|  Error Warnings: Expense values must exceed zero.       |
|                                                         |
|  -----------------------------------------------------  |
|  Calculated Settlements Aggregation:                    |
|  - Yuri owes Tommy: JPY 4,000                           |
|  - Guest owes Tommy: JPY 4,000                          |
|  -----------------------------------------------------  |
|                                                         |
|  [Button: Confirm and Update Ledger (CTA Orange)]        |
|                                                         |
+---------------------------------------------------------+
```

* Validation Warnings: Input validator blocks negative entry numbers, warning with subtle shake motions. Decimal remaining round-offs automatically fall back onto first payers.

---

### Screen 7: Smart Packing Checklist
Group-scoped packing checklist workspace allowing classified filtering, categorized items, and editor checklists.

#### ASCII Wireframe Layout (iOS Viewport)
```
+---------------------------------------------------------+
|                    PACKING CHECKLIST                    |
+---------------------------------------------------------+
|                                                         |
|  Filters: [All] [X Electronics] [ Documents ]           |
|                                                         |
|  +----------------------------------------------------+ |
|  | Documents Folder (Category)                         | |
|  | [X] Physical Passport Book (Assigned: Tommy)       | |
|  | [X] Digital Insurance Policy Copies (Assigned: Yuri)| |
|  +----------------------------------------------------+ |
|  +----------------------------------------------------+ |
|  | Gear & Electronics (Category)                       | |
|  | [ ] Multi-volt Travel Adapters (Assigned: Guest)    | |
|  | [X] High Capacity Batteries (Assigned: Tommy)       | |
|  | [Button: Append Required Gear Item]                 | |
|  +----------------------------------------------------+ |
|                                                         |
|  Completeness Bar: 80 percent packed                   | |
|  ==========================================......       | |
|                                                         |
+---------------------------------------------------------+
```

* Interactions: Checking an item invokes subtle vibration haptics on target handheld platforms and scales checking animations instantly.

---

### Screen 8: User Profile & Dynamic Notifications Workspace
Comprehensive configuration center managing AI preferences, target travel settings, and real-time activities.

#### ASCII Wireframe Layout (Desktop Modular Dashboard)
```
+---------------------------------------------------------------------------------+
| USER PREFERENCES PORTAL                                                         |
+---------------------------------------------------------------------------------+
|  AI Profile Engine Customization       | Real-time Collaborative Alerts         |
|  Select AI Generation Depth:           |                                        |
|  ( ) Raw Point Coordinates             | [ Alert: Yuri adjusted Day 2 schedule] |
|  (X) Immersive Destination Briefings   |   Time: 10:14 AM                       |
|  ( ) Custom Map Outlines Only          |                                        |
|                                        | [ Alert: Invoice Settlement Modified ] |
|  Pace Tuning Tracker:                  |   Time: 09:30 AM                       |
|  [ Slow / Relaxing ] [X Active / Dense]|                                        |
|                                        | [Button: Authorize Web Notification]   |
|  Toggle Interface Styles:              |                                        |
|  [X] Use Dynamic Contrast Modes        |                                        |
|  [Button: Save System Preferences]     |                                        |
+---------------------------------------------------------------------------------+
```

---

## 5. Accessibility & Motion Taxonomy

### 5.1 VoiceOver Navigation Rules
* Interactive Elements: Header panels, flight-destination input arrays, list blocks, control buttons are annotated explicit hierarchy attributes using semantic HTML descriptors rather than nested layers.
* Tab Sequences: Natural reading sequence matches left-to-right reading hierarchies, moving downstream in order of visual layout positioning.
* Real-time Sync Reader Alerts: Major collaborator-driven updates trigger assertive screen-reader live updates so visually impaired co-planners receive vocal statements corresponding to itinerary modifications.

### 5.2 Responsive Motion Framework
* Timing Tokens:
  * Spring Smooth Default: response=0.42, damping=0.9 – applied for page and large modal entry views.
  * Spring Snappy: response=0.28, damping=0.8 – utilized for small button press expansions or active checkbox toggles.
  * Spring Bouncy: response=0.36, damping=0.68 – dedicated to celebrating trip generation accomplishments or completing packing checkboxes.

---

## 6. Designer's Notes on Cross-Platform Adaptation

### Desktop Web Optimization
Maximize canvas area by rendering map tracks side-by-side with active days, limiting the need to context-switch. Establish sidebars for group lists, checklists, and active invoice summaries.

### Native Mobile iOS Optimization
Utilize high safe-area-inset bounds (margins: left=16pt, right=16pt) to bypass hardware status overlays. Target clean 44pt clickable zones on compact screens. Limit high-impact canvas parallax sequences when battery saving modes are turned on. Do not crowd workspaces block-by-block, and reserve generous margins to ensure readability.
