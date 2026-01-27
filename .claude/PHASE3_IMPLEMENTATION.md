# Phase 3: User Journey & Interaction Intelligence

**Goal:** Analyze the application's behavior throughout the user session, not just the initial load.
**Key Features:** Hydration Error Monitoring and SPA Navigation Performance.

---

## 🏗️ Architecture Change: The "Probe" Script

Since hydration errors happen at page load (before the user opens the extension), and `console.error` overrides require execution in the **MAIN** world (hosting the page's JS), we must introduce a permanent content script.

### 1. `src/probe.js` (Main World Script)
*   **Injection:** via `manifest.json` (`run_at: document_start`, `world: "MAIN"`).
*   **Responsibility:**
    *   buffer `console.error` logs related to React/Vue hydration mismatches.
    *   buffer `history.pushState` / `replaceState` calls to track Soft Navigations.
    *   Store this data in hidden DOM elements (data-attributes) or a global variable that can be serialized to DOM upon request.
    *   *Mechanism:* Writes to `<script id="__SSR_DETECTOR_DATA__" type="application/json">` or similar when data updates, or simply exposes a custom event listener that writes to DOM when queried.

### 2. `src/detectors/hydration-detector.js` (Isolated World)
*   **Responsibility:**
    *   Locate the data exposed by `probe.js`.
    *   Parse the hydration error logs.
    *   Identify specific error patterns (e.g., `Text content does not match server-rendered HTML`).
    *   Calculate a "Hydration Health Score".

### 3. `src/detectors/navigation-detector.js` (Isolated World)
*   **Responsibility:**
    *   Read navigation metrics from `probe.js`.
    *   Calculate average soft navigation duration (if measurable).
    *   Identify if the site uses client-side routing (SPAs).

---

## 🛠️ Implementation Steps

### Step 1: Create the Probe
- [ ] Create `extension/src/probe.js`
- [ ] Implement `console.error` proxy
- [ ] Implement `history` proxy

### Step 2: Register Probe
- [ ] Update `extension/manifest.json` to inject `probe.js`
- [ ] Ensure it runs at `document_start`

### Step 3: Create Detectors
- [ ] Create `extension/src/detectors/hydration-detector.js`
- [ ] Create `extension/src/detectors/navigation-detector.js`
- [ ] Add them to `extension/scripts/build-bundle.js`

### Step 4: Integration
- [ ] Update `extension/src/core/analyzer.js` to use new detectors
- [ ] Update `extension/popup.js` (Telemetry) to send new data
- [ ] Update Backend (Database + dashboard) to receive new data

---

## 🔍 Hydration Error Patterns to Detect

**React:**
*   "Text content does not match server-rendered HTML"
*   "Hydration failed"
*   "There was an error while hydrating"
*   "Prop `className` did not match"

**Vue:**
*   "Hydration node mismatch"
*   "Client-side rendered virtual DOM tree is not matching server-rendered"

---

## 📊 Metrics to Collect

**Hydration:**
*   `hydrationMismatchCount`: Number of errors
*   `hydrationErrorDetails`: Array of specific error messages (truncated)

**Navigation:**
*   `clientSideNavigations`: Count of `pushState` calls
*   `avgNavigationLatency`: (Hard to measure accurately without user interaction events, but we can track time between pushState and next paint if using Performance API)

