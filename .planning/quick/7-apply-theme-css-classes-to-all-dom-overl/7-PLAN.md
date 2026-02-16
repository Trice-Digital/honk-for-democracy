---
phase: quick-7
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/game/scenes/SignCraftScene.ts
  - src/game/scenes/ScoreScene.ts
  - src/game/scenes/ActivismScene.ts
  - src/game/managers/MenuManager.ts
  - src/game/managers/HUDManager.ts
  - src/game/systems/EventSystem.ts
  - src/game/managers/PlayerController.ts
  - src/game/managers/ReactionFeedbackManager.ts
autonomous: true
must_haves:
  truths:
    - "All DOM overlays use theme.css classes instead of hardcoded neobrutalist styles"
    - "No hardcoded #1a1a1a, 3px solid, 4px 4px 0, or font-family values remain in scene/manager files"
    - "Visual appearance is unchanged (theme classes produce the same look)"
    - "All functional behavior is preserved (no logic changes)"
  artifacts:
    - path: "src/game/scenes/SignCraftScene.ts"
      provides: "Theme-classed sign craft UI"
      contains: "className"
    - path: "src/game/scenes/ScoreScene.ts"
      provides: "Theme-classed score overlay"
      contains: "className"
    - path: "src/game/scenes/ActivismScene.ts"
      provides: "Theme-classed activism overlay"
      contains: "className"
  key_links:
    - from: "all DOM overlay files"
      to: "src/styles/theme.css"
      via: "className assignments using theme classes"
      pattern: "className.*=.*(panel|btn-primary|btn-secondary|scene-overlay)"
---

<objective>
Replace all hardcoded inline styles in DOM overlay files with theme.css class assignments and CSS custom properties.

Purpose: Establish theme.css as the single source of truth for neobrutalist styling across all DOM overlays, eliminating duplicated style values and enabling future theme changes from one file.
Output: All 8 DOM overlay files updated to use className-based styling.
</objective>

<execution_context>
@/home/scott/.claude/get-shit-done/workflows/execute-plan.md
@/home/scott/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/styles/theme.css
@mockups/sign-craft-redesign.html
</context>

<tasks>

<task type="auto">
  <name>Task 1: Convert SignCraftScene.ts to theme classes</name>
  <files>src/game/scenes/SignCraftScene.ts</files>
  <action>
Read src/game/scenes/SignCraftScene.ts and mockups/sign-craft-redesign.html for reference.

SignCraftScene is the largest file (~85 inline style occurrences). Replace ALL hardcoded styles with theme.css className assignments. Specific mappings:

- Full-screen overlay container: className = "scene-overlay"
- Grid layout wrapper: className = "scene-layout"
- Left column (sign preview): className = "sign-preview-col"
- Right column (controls): className = "controls-col"
- Control panels: className = "panel"
- Tab bar container: className = "tab-bar"
- Individual tabs: className = "tab" (active tab gets "tab active")
- Tab step numbers: className = "tab-number"
- Material/color swatch grids: className = "swatch-grid"
- Individual swatches: className = "swatch" (selected gets "swatch selected")
- Swatch category labels: className = "swatch-label"
- Text input/textarea: className = "input"
- Character counter: className = "char-count" (over limit: "char-count warning")
- Hint/help text: className = "hint"
- Section labels: className = "section-label"
- Primary buttons (START PROTESTING): className = "btn-primary"
- Secondary buttons (RANDOMIZE): className = "btn-secondary"
- Sign preview area: className = "sign-preview"
- Action buttons row: className = "sign-actions"
- Tape strip labels: className = "tape-strip"

For elements that need BOTH a theme class AND some custom positioning/sizing, use className for the theme part and only keep minimal inline styles for layout-specific values (e.g., specific widths, absolute positioning). Use CSS custom properties (var(--black), var(--font-ui), etc.) for any remaining inline style values -- NEVER hardcode hex colors or font names.

Do NOT change any functional logic (tab switching, swatch selection, Fabric.js canvas, event handlers, data flow). Only change how styles are applied.
  </action>
  <verify>
Run: grep -cE '#1a1a1a|3px solid #|4px 4px 0|font-family:' src/game/scenes/SignCraftScene.ts
Expected: 0 matches (all hardcoded values eliminated)
Run: grep -c 'className' src/game/scenes/SignCraftScene.ts
Expected: 20+ matches (theme classes applied throughout)
Run: npm run build 2>&1 | tail -5
Expected: Build succeeds without errors
  </verify>
  <done>SignCraftScene.ts has zero hardcoded neobrutalist style values. All visual styling uses theme.css classes via className assignments. Build passes. Visual appearance matches mockup.</done>
</task>

<task type="auto">
  <name>Task 2: Convert remaining 7 DOM overlay files to theme classes</name>
  <files>
    src/game/scenes/ScoreScene.ts
    src/game/scenes/ActivismScene.ts
    src/game/managers/MenuManager.ts
    src/game/managers/HUDManager.ts
    src/game/systems/EventSystem.ts
    src/game/managers/PlayerController.ts
    src/game/managers/ReactionFeedbackManager.ts
  </files>
  <action>
Read each file and replace hardcoded styles with theme.css classes. These files are smaller (1-8 matches each). Apply these mappings:

**ScoreScene.ts** (~4 matches): Panel containers use className="panel", buttons use className="btn-primary" or "btn-secondary", any font-family/border/shadow inline styles replaced with theme classes or CSS vars.

**ActivismScene.ts** (~2 matches): Same pattern -- panels get "panel", buttons get btn classes.

**MenuManager.ts** (~1 match): Menu panel containers get "panel", menu buttons get btn classes.

**HUDManager.ts** (~2 matches): HUD labels/panels -- use "tape-strip" for label overlays, "panel" for info panels. HUD elements may need to keep some positioning styles but replace colors/fonts/borders with CSS vars.

**EventSystem.ts** (~8 matches): Dialogue panels get "panel", dialogue text uses var(--font-body) and var(--black) instead of hardcoded values, buttons get btn classes. This file has the most matches in this group.

**PlayerController.ts** (~1 match): UI overlay elements -- replace hardcoded styles with theme classes or CSS vars.

**ReactionFeedbackManager.ts** (~2 matches): Feedback labels -- use "tape-strip" or appropriate theme class, replace hardcoded font/color/border values with CSS vars.

For ALL files: where a theme class covers the full styling need, use className. Where only partial coverage, use className for the base plus CSS custom properties for remaining values. NEVER hardcode hex colors, font names, border values, or shadow values.

Do NOT change any functional behavior.
  </action>
  <verify>
Run: grep -rlcE '#1a1a1a|3px solid #|4px 4px 0|font-family:' src/game/scenes/ScoreScene.ts src/game/scenes/ActivismScene.ts src/game/managers/MenuManager.ts src/game/managers/HUDManager.ts src/game/systems/EventSystem.ts src/game/managers/PlayerController.ts src/game/managers/ReactionFeedbackManager.ts
Expected: 0 matches across all 7 files
Run: npm run build 2>&1 | tail -5
Expected: Build succeeds
  </verify>
  <done>All 7 remaining DOM overlay files have zero hardcoded neobrutalist style values. All visual styling uses theme.css classes or CSS custom properties. Build passes. No functional behavior changed.</done>
</task>

</tasks>

<verification>
1. grep -rE '#1a1a1a|3px solid #|4px 4px 0' src/game/scenes/ src/game/managers/ src/game/systems/EventSystem.ts returns 0 matches
2. grep -rc 'className' across all 8 files shows widespread theme class usage
3. npm run build succeeds
4. npm run dev -- start dev server, visually confirm overlays render correctly (SignCraft, Score, Activism scenes, menus, HUD, event dialogues)
</verification>

<success_criteria>
- Zero hardcoded neobrutalist style values (#1a1a1a, 3px solid, 4px 4px 0, font-family) in any of the 8 target files
- All DOM elements use theme.css classes via className or CSS custom properties via var()
- Build passes without errors
- No functional behavior changes (only styling implementation)
</success_criteria>

<output>
After completion, create `.planning/quick/7-apply-theme-css-classes-to-all-dom-overl/7-SUMMARY.md`
</output>
