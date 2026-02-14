# Plan 06-02: Activism End Screen + Resource Links

## Goal
After the score screen, show an activism screen that bridges the game experience to real-world action.

## Tasks

1. Create `src/game/scenes/ActivismScene.ts`
   - Dark background with impactful messaging
   - Hero text: "This was a game." then "This is also real."
   - Brief context paragraph about protest rights
   - Resource links (rendered as tappable buttons that open in new tab):
     - ACLU Know Your Rights: https://www.aclu.org/know-your-rights/protesters-rights
     - Register to Vote: https://vote.gov
     - Find Your Representatives: https://www.usa.gov/elected-officials
     - Protest Safety Tips (general info card, no external link)
   - "Play Again" button at the bottom

2. Implement link opening via `window.open()` from Phaser interactive elements

3. Register ActivismScene in gameConfig.ts

4. Wire: ScoreScene "Continue" -> ActivismScene

## Verification
- Score screen "Continue" transitions to ActivismScene
- All resource links open correct URLs in new tabs
- "Play Again" returns to SignCraftScene
- Screen is readable and impactful on mobile
