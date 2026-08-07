# Implementation Plan: SuperXO

## Overview

Build SuperXO incrementally, wiring each module to the router as it's completed. Start with the foundation (storage + theme + navigation), then the Classic game loop, then AI + enhancements, then Ultimate, then the meta-features (stats, achievements, coins, settings, tutorial). Every screen referenced in navigation will be fully implemented — no placeholder UI.

---

## Tasks

- [x] 1. Refactor HTML for multi-screen SPA architecture
  - Replace the current single-file layout with a full set of `<div class="screen" id="...">` sections covering all screens: splash, home, gameSelect, classicSetup, classicGame, ultimateSetup, ultimateGame, statistics, achievements, settings, tutorial, about, replay
  - Add `<link rel="modulepreload">` and `<script type="module" src="js/main.js">` at the bottom of `<body>`
  - Add the coin display element to home and achievements headers
  - _Requirements: 2.1, 2.4, 19.3_

- [ ] 2. Implement `storage.js` — localStorage abstraction
  - [x] 2.1 Write `Storage.DEFAULTS`, `Storage.get(key)`, `Storage.set(key, value)`, `Storage.clear()`
    - Wrap `JSON.parse` / `JSON.stringify` in try/catch with fallback to defaults
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  - [x] 2.2 Write property test for Storage round-trip
    - **Property 6: Storage round-trip**
    - **Validates: Requirements 17.1, 17.2**

- [ ] 3. Implement `theme.js` — CSS custom-property theming
  - [x] 3.1 Define all 10 theme objects and `Theme.apply()`, `Theme.getCurrent()`, `Theme.getAll()`, `Theme.isUnlocked()`, `Theme.unlock()`
    - Apply theme vars to `:root` via `document.documentElement.style.setProperty`
    - _Requirements: 13.1, 13.2, 13.5_
  - [x] 3.2 Write property test for Theme CSS variables
    - **Property 10: Theme.apply always sets all required CSS custom properties**
    - **Validates: Requirements 13.2**

- [ ] 4. Implement `main.js` — router, splash logic, and navigation
  - Implement `navigate(screenId, direction)`, `navigateBack()`, `initApp()`, `showSplash()`, `skipSplash()`
  - Wire up splash progress bar and first-launch detection via `Storage.get('splashSeen')`
  - Wire Home buttons to their target screens
  - Apply `Theme.applyAll()` and `Settings.applyAll()` on init
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [ ] 5. Implement `settings.js` and Settings screen
  - [ ] 5.1 Write `Settings.get(key)`, `Settings.set(key, value)`, `Settings.applyAll()`
    - Apply dark/light body class, animation class, sound/music state
    - _Requirements: 14.1, 14.2_
  - [ ] 5.2 Wire Settings screen UI — toggles for dark mode, animations, sound, music, timer default; version display; Reset Progress button with confirmation Dialog
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 6. Implement `sound.js` — Web Audio API synthesis
  - Implement `Sound.play(name)` for: `'place'`, `'win'`, `'draw'`, `'click'`, `'unlock'`, `'error'`
  - Implement `Sound.setEnabled(bool)` and `Sound.toggle()`
  - _Requirements: 14.1_

- [ ] 7. Implement `ai.js` — Minimax AI engine
  - [ ] 7.1 Implement `AI.minimax(board, isMaximizing, alpha, beta, depth)`, `AI.score(board, player)`, `AI.getBestMove(board, difficulty)`
    - Map difficulty to random-vs-minimax ratios as specified in the design
    - Guard: return `null` on terminal board
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ] 7.2 Write property test: AI move is always valid
    - **Property 4: AI.getBestMove always returns a valid empty-cell index**
    - **Validates: Requirements 6.1, 6.2, 6.3**
  - [ ] 7.3 Write property test: Impossible AI never loses
    - **Property 5: Impossible AI never loses from opening position**
    - **Validates: Requirements 6.3**

- [ ] 8. Implement `timer.js`
  - Implement `Timer.start(duration, onTick, onExpire)`, `Timer.stop()`, `Timer.reset(duration)`, `Timer.getRemaining()`
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 9. Implement Classic game — setup screen and core game loop
  - [ ] 9.1 Build Classic setup screen: player name inputs, HvH/HvAI toggle, difficulty selector, rounds selector, timer toggle + duration selector
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ] 9.2 Implement `classic.js` core: `ClassicState`, `Classic.init(config)`, `Classic.handleCellClick(idx)`, `checkWinner(board)`, win animation, draw detection, score updates, round management
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [ ] 9.3 Write property test: win detection exhaustive and symmetric
    - **Property 1: Classic win detection is exhaustive and symmetric**
    - **Validates: Requirements 5.4**
  - [ ] 9.4 Write property test: draw detection correct
    - **Property 2: Classic draw detection on full no-winner boards**
    - **Validates: Requirements 5.5**
  - [ ] 9.5 Integrate Timer into Classic game — start on turn begin, reset on turn change, forfeit on expire, urgency indicator at ≤5 s
    - _Requirements: 5.10, 9.1, 9.2, 9.3_
  - [ ] 9.6 Implement AI turn flow in Classic — thinking animation (≥400 ms), call `AI.getBestMove`, place move
    - _Requirements: 6.4, 6.5_

- [ ] 10. Implement `hint.js` and `Classic.undo()`
  - Implement `Hint.request(board, player, remaining)` delegating to `AI.getBestMove(..., 'impossible')`; throw `HintExhaustedError` at 0
  - Implement `Classic.undo()`: pop last move from `moveHistory`, restore board and `currentPlayer`, only in HvH mode
  - Wire hint button (max 3 per game) and undo button to Classic game screen
  - _Requirements: 5.8, 5.9_

- [ ] 11. Checkpoint — Classic game milestone
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement `replay.js` and Replay screen
  - [ ] 12.1 Implement `Replay.load(moveHistory, mode)`, `Replay.stepForward()`, `Replay.stepBack()`, `Replay.getCurrentStep()`, `Replay.reset()`
    - Reconstruct board state by replaying moves from index 0 each time (no mutation of live state)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [ ] 12.2 Write property test: replay round-trip
    - **Property 3: Move history replay round-trip**
    - **Validates: Requirements 8.2, 8.3**

- [ ] 13. Implement `statistics.js` and Statistics screen
  - [ ] 13.1 Implement `Statistics.record(result)`, `Statistics.get()`, `Statistics.reset()`, `Statistics.renderGraph()`
    - `renderGraph()` draws a bar chart on a `<canvas>` element showing win/loss/draw across recent 20 games
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [ ] 13.2 Wire Statistics screen UI: display all tracked fields, embed canvas graph, wire Reset Statistics button with confirmation Dialog
    - _Requirements: 10.3, 10.4, 10.5_

- [ ] 14. Implement `achievements.js` and Achievements screen
  - [ ] 14.1 Implement all 9 achievement definitions, `Achievements.check(stats)`, `Achievements.unlock(id)`, `Achievements.getAll()`, `Achievements.isUnlocked(id)`
    - `unlock` awards coins, persists, shows animated toast notification
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [ ] 14.2 Write property test: Achievement unlock idempotence
    - **Property 7: Achievement unlock is idempotent**
    - **Validates: Requirements 11.4**
  - [ ] 14.3 Wire Achievements screen UI: list all achievements with unlock status, description, coin reward, progress bar
    - _Requirements: 11.3_

- [ ] 15. Implement Coins economy and unlock gates
  - [ ] 15.1 Implement coin award logic in `statistics.js` and `achievements.js` — difficulty-scaled win reward, achievement reward, round completion reward
    - _Requirements: 12.1, 12.2_
  - [ ] 15.2 Implement theme unlock gates in `theme.js`: check `stats.played` against thresholds before allowing `Theme.unlock()`
    - _Requirements: 12.3_
  - [ ] 15.3 Implement piece color pack purchase in `settings.js`/`theme.js`: deduct coins, persist unlock, apply immediately; show insufficient-coins Dialog on shortfall
    - _Requirements: 12.4, 12.5, 12.6, 12.7_
  - [ ] 15.4 Write property test: Coin balance never goes negative
    - **Property 8: Coin balance never goes negative**
    - **Validates: Requirements 12.5, 12.6**

- [ ] 16. Implement board and piece customization UI in Settings
  - Add board customization controls (grid style, border style, corner radius, glow intensity, winning line style) that write to `Storage.set('boardCustom', ...)`
  - Add piece color picker with live preview for X and O; show lock state for unpurchased packs
  - _Requirements: 13.3, 13.4, 13.5_

- [ ] 17. Checkpoint — stats, achievements, coins milestone
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Implement Ultimate Tic-Tac-Toe
  - [ ] 18.1 Build Ultimate setup screen (same config options as Classic)
    - _Requirements: 3.3_
  - [ ] 18.2 Implement `ultimate.js` core: `UltimateState`, `Ultimate.init(config)`, `Ultimate.handleCellClick(boardIdx, cellIdx)`, active-board routing, local-board win detection, global-board win detection, draw logic
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  - [x] 18.3 Write property test: Ultimate active-board routing
    - **Property 9: Ultimate active-board routing after every move**
    - **Validates: Requirements 7.2**
  - [ ] 18.4 Integrate Timer, Replay, Statistics persistence, and AI into Ultimate game
    - _Requirements: 7.8_

- [ ] 19. Implement `tutorial.js` and Tutorial screens
  - Implement data-driven step engine: `Tutorial.startClassic()`, `Tutorial.startUltimate()`, `Tutorial.nextStep()`, `Tutorial.prevStep()`, `Tutorial.enterPractice()`, `Tutorial.exit()`
  - Build Classic tutorial (step array covering basic rules, winning, draws)
  - Build Ultimate tutorial (step array covering board routing, local vs global win)
  - Practice mode: live board with no stats persistence
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] 20. Implement About screen
  - Static screen displaying developer name, institution, degree, version, credits, and privacy notice
  - _Requirements: 16.1_

- [ ] 21. Polish — CSS, animations, responsive layout, accessibility
  - Flesh out `css/animations.css`: cell-place scale bounce, win-line draw animation, screen fade/slide transitions, achievement toast slide-in, AI thinking pulse
  - Flesh out `css/responsive.css`: fluid layout from 320 px to 1920 px; board scales with `clamp()`
  - Flesh out `css/game.css`: Classic and Ultimate board grid, active-board highlight, dim inactive boards, winning cell glow
  - Flesh out `css/home.css`: home menu button hover ripple, play button glow
  - Add `aria-label`, `role`, and keyboard `tabindex` to all interactive elements
  - Verify WCAG 2.1 AA contrast for all themes
  - _Requirements: 18.1, 18.3, 18.5, 18.6_

- [ ] 22. PWA setup and performance
  - Add `manifest.json` with app name, icons, theme color, and `display: standalone`
  - Add `sw.js` service worker that caches all static assets on install
  - Register service worker in `main.js`
  - _Requirements: 18.4_

- [ ] 23. Final checkpoint — full application
  - Ensure all tests pass, all screens are reachable, no broken navigation states exist, ask the user if questions arise.

---

## Notes

- All tasks are required — comprehensive coverage from the start
- Each task references specific requirements for traceability
- Checkpoints (tasks 11, 17, 23) ensure incremental validation
- Property tests use **fast-check** (CDN import in test harness) with ≥100 iterations each
- Unit tests cover specific examples, edge cases, and error conditions
- All 10 correctness properties from the design doc are covered by property test sub-tasks
