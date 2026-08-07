# Requirements Document

## Introduction

SuperXO is a premium, offline-first, production-quality web application delivering Classic and Ultimate Tic-Tac-Toe. It targets mobile, tablet, and desktop browsers and is designed to feel like a polished commercial game — not a college project. The app uses a glassmorphism dark-mode aesthetic with neon accents, modular JavaScript architecture, persistent statistics, an achievement/coin economy, full theme and piece customization, and an AI opponent with five difficulty levels. The splash screen appears on first launch only. All screens navigate smoothly without page reloads.

---

## Glossary

- **App**: The SuperXO single-page web application.
- **Splash**: The full-screen animated loading/intro screen.
- **Home**: The main menu screen shown after the splash.
- **Game_Select**: The mode-selection screen (Classic or Ultimate).
- **Classic_Game**: The 3×3 Tic-Tac-Toe game screen.
- **Ultimate_Game**: The 9-board Ultimate Tic-Tac-Toe game screen.
- **AI**: The computer opponent powered by Minimax with Alpha-Beta pruning.
- **Player**: A human participant identified by a name and avatar choice.
- **Cell**: An individual playable square on the Classic board.
- **Local_Board**: One of the nine 3×3 boards inside the Ultimate board.
- **Global_Board**: The outer 3×3 board tracking which player has won each Local_Board.
- **Active_Board**: The Local_Board the current player must play in, determined by the previous move.
- **Score**: Session-level win/draw/loss counts shown during a game.
- **Statistics**: Persistent lifetime game records stored in localStorage.
- **Achievement**: A milestone unlocked by meeting a defined in-game condition.
- **Coin**: In-app currency earned through gameplay, used for cosmetic unlocks.
- **Theme**: A named visual skin applied to the entire App UI.
- **Piece_Color**: The colour assigned to X or O symbols, purchasable with Coins.
- **Hint**: A one-time best-move suggestion (maximum 3 per game) powered by AI analysis.
- **Undo**: Reversing the last move, available once per turn.
- **Replay**: Step-by-step playback of a completed game's move history.
- **Timer**: An optional per-turn countdown displayed during a game.
- **Dialog**: A styled modal overlay used for results, confirmations, and prompts.
- **Settings**: Persistent user preferences (theme, sound, music, timer, animations).
- **Storage**: The browser's localStorage used for all persistent data.

---

## Requirements

### Requirement 1: Splash Screen

**User Story:** As a first-time user, I want to see an animated splash screen on launch, so that the app feels premium and polished.

#### Acceptance Criteria

1. WHEN the App is loaded for the first time, THE Splash SHALL display a full-screen animated logo, a progress bar that fills over approximately 15 seconds, and a "Tap Anywhere to Continue" prompt after the bar completes.
2. WHEN the user taps or clicks after the progress bar completes, THE Splash SHALL fade out and reveal the Home screen.
3. WHEN the App is loaded on a subsequent visit, THE Splash SHALL be skipped and the Home screen SHALL be shown immediately.
4. THE Splash SHALL display the app version string in the bottom corner.

---

### Requirement 2: Home Screen Navigation

**User Story:** As a player, I want a clear main menu, so that I can access all app sections without confusion.

#### Acceptance Criteria

1. THE Home SHALL display buttons for Play, Statistics, Achievements, Tutorial, Settings, and About.
2. WHEN a menu button is tapped, THE App SHALL navigate to the corresponding screen using a smooth fade or slide transition under 300 ms.
3. WHEN the back action is triggered on any secondary screen, THE App SHALL navigate to the previous screen without a page reload.
4. THE App SHALL never display a broken or empty navigation state at any point.

---

### Requirement 3: Game Mode Selection

**User Story:** As a player, I want to choose between Classic and Ultimate Tic-Tac-Toe, so that I can pick the experience I want.

#### Acceptance Criteria

1. THE Game_Select SHALL display buttons for Classic Tic-Tac-Toe and Ultimate Tic-Tac-Toe.
2. WHEN Classic is selected, THE App SHALL navigate to the Classic game setup screen.
3. WHEN Ultimate is selected, THE App SHALL navigate to the Ultimate game setup screen.

---

### Requirement 4: Classic Game — Setup

**User Story:** As a player, I want to configure a Classic game before it starts, so that the session matches my preferences.

#### Acceptance Criteria

1. THE Classic_Game setup SHALL allow Player 1 and Player 2 to enter names (defaulting to "Player 1" and "Player 2" if left blank).
2. THE Classic_Game setup SHALL allow selection of Human vs Human or Human vs AI mode.
3. WHERE Human vs AI is selected, THE Classic_Game setup SHALL allow selection of AI difficulty: Beginner, Easy, Medium, Hard, or Impossible.
4. THE Classic_Game setup SHALL allow selection of number of rounds (1, 3, 5, or 7).
5. THE Classic_Game setup SHALL allow the Timer to be toggled on or off; WHERE Timer is on, a per-turn duration SHALL be selectable (15 s, 30 s, or 60 s).

---

### Requirement 5: Classic Game — Gameplay

**User Story:** As a player, I want to play a fully functional Classic Tic-Tac-Toe game, so that I can enjoy the core experience.

#### Acceptance Criteria

1. THE Classic_Game SHALL display a 3×3 board, a turn indicator naming the current Player, and a session Score.
2. WHEN a Player taps a valid empty Cell, THE Classic_Game SHALL place that Player's symbol in the Cell and switch turns.
3. WHEN a Player taps an occupied Cell or when the game is over, THE Classic_Game SHALL ignore the tap.
4. WHEN three matching symbols occupy a winning pattern, THE Classic_Game SHALL detect the winner, animate the winning line, update the Score, and display a Dialog naming the winner.
5. WHEN all nine Cells are filled with no winning pattern, THE Classic_Game SHALL detect a draw, update the Score, and display a Dialog stating the draw.
6. WHEN the winner of a round is determined, THE Classic_Game SHALL start the next round with the winning Player going first; IF the round was a draw, THE Classic_Game SHALL alternate the starting Player.
7. WHEN all rounds are complete, THE Classic_Game SHALL display a match summary Dialog and persist the result to Statistics.
8. THE Classic_Game SHALL support an Undo action that reverses the last move once per turn, available only in Human vs Human mode.
9. THE Classic_Game SHALL provide up to 3 Hint actions per game that highlight the best available Cell using AI analysis.
10. WHERE Timer is enabled, WHEN a Player's turn time expires, THE Classic_Game SHALL treat the turn as a forfeit and switch to the opponent.
11. THE Classic_Game SHALL record every move in a move history list suitable for Replay.

---

### Requirement 6: Classic Game — AI Opponent

**User Story:** As a solo player, I want to play against an AI with selectable difficulty, so that I can enjoy a challenge at my own level.

#### Acceptance Criteria

1. WHEN AI difficulty is Beginner or Easy, THE AI SHALL make intentional random or suboptimal moves to simulate human-like mistakes.
2. WHEN AI difficulty is Medium, THE AI SHALL mix optimal and suboptimal moves.
3. WHEN AI difficulty is Hard or Impossible, THE AI SHALL use Minimax with Alpha-Beta pruning to select the best move.
4. WHEN it is the AI's turn, THE Classic_Game SHALL display a thinking animation for a minimum of 400 ms before placing the AI's symbol.
5. THE AI SHALL expose a `getBestMove(board, difficulty)` function usable by the Hint system.

---

### Requirement 7: Ultimate Tic-Tac-Toe — Gameplay

**User Story:** As an advanced player, I want to play Ultimate Tic-Tac-Toe following official rules, so that I can enjoy the strategic variant.

#### Acceptance Criteria

1. THE Ultimate_Game SHALL display nine Local_Boards arranged in a 3×3 Global_Board grid.
2. WHEN a Player makes a move in cell _c_ of any Local_Board, THE Ultimate_Game SHALL set the Active_Board to the Local_Board at global position _c_ for the next turn.
3. IF the required Active_Board is already won or drawn, THE Ultimate_Game SHALL allow the current Player to play in any open Local_Board.
4. THE Ultimate_Game SHALL visually highlight the Active_Board and dim all inactive Local_Boards.
5. WHEN a Player wins a Local_Board, THE Ultimate_Game SHALL mark that position on the Global_Board with the Player's symbol and prevent further play in that Local_Board.
6. WHEN a Player wins three positions in a row on the Global_Board, THE Ultimate_Game SHALL declare that Player the global winner and display a victory Dialog.
7. WHEN all Local_Boards are resolved with no global winner, THE Ultimate_Game SHALL declare a global draw.
8. THE Ultimate_Game SHALL persist results to Statistics and support Replay.

---

### Requirement 8: Replay

**User Story:** As a player, I want to replay a completed game move by move, so that I can review and learn from my play.

#### Acceptance Criteria

1. WHEN a game ends, THE App SHALL store the complete ordered move history.
2. WHEN the user opens Replay, THE Replay SHALL reconstruct the board state from move 0 and allow stepping forward and backward one move at a time.
3. THE Replay SHALL display the move number, the player who made each move, and the board state after each move.
4. WHEN stepping through moves, THE Replay SHALL animate each board change using the same cell-fill animation as live play.

---

### Requirement 9: Timer

**User Story:** As a player, I want an optional per-turn countdown timer, so that games stay fast-paced.

#### Acceptance Criteria

1. WHERE Timer is enabled, THE Timer SHALL count down from the configured duration each turn and reset when the turn changes.
2. WHEN the Timer reaches zero, THE Classic_Game SHALL forfeit the current Player's turn as specified in Requirement 5.10.
3. THE Timer SHALL display a visual urgency indicator when 5 seconds or fewer remain.
4. WHERE Timer is disabled, THE Classic_Game SHALL not display any timer UI.

---

### Requirement 10: Statistics

**User Story:** As a player, I want persistent statistics, so that I can track my performance over time.

#### Acceptance Criteria

1. THE Statistics SHALL track: total games played, wins, losses, draws, current win streak, best win streak, AI record (wins/losses vs AI), favorite mode, average game duration, and a match history list.
2. WHEN a game completes, THE App SHALL update all relevant Statistics fields and persist them to Storage immediately.
3. THE Statistics screen SHALL display all fields with clear labels and values.
4. WHERE Statistics contain enough data, THE Statistics screen SHALL display a bar or line graph of win/loss/draw ratios over recent games.
5. WHEN the user triggers "Reset Statistics", THE App SHALL display a confirmation Dialog before clearing all Statistics from Storage.

---

### Requirement 11: Achievements

**User Story:** As a player, I want to unlock achievements, so that I feel rewarded for reaching milestones.

#### Acceptance Criteria

1. THE App SHALL define the following Achievements: First Win, 5 Wins, 10 Wins, 25 Wins, 50 Wins, 100 Wins, Perfect Game (win without opponent scoring), Beat Impossible AI, Marathon Player (50 games played).
2. WHEN an Achievement condition is met, THE App SHALL unlock the Achievement, display an animated toast notification, award the defined Coin amount, and persist the unlock to Storage.
3. THE Achievements screen SHALL display all Achievements with unlock status, description, Coin reward, and a progress bar showing progress toward locked Achievements.
4. WHEN an Achievement is already unlocked, THE App SHALL not award it again.

---

### Requirement 12: Coins and Unlocks

**User Story:** As a player, I want to earn Coins and spend them on cosmetics, so that I feel rewarded without pay-to-win mechanics.

#### Acceptance Criteria

1. THE App SHALL award Coins for: winning a game (difficulty-scaled), unlocking Achievements, and completing rounds.
2. THE App SHALL track the current Coin balance in Storage and display it prominently on the Home and Achievements screens.
3. THE App SHALL offer the following unlock gates by total games played: Free Theme at 0 games, additional Themes at 2, 5, 10, 15, 20, 25, 50, 75, and 100 games.
4. THE App SHALL offer 5 X/O Piece Color packs purchasable with Coins, each containing an independent X color and O color.
5. WHEN a user purchases an item, THE App SHALL deduct the Coin cost, persist the updated balance, and immediately apply the unlock.
6. IF a user has insufficient Coins, THE App SHALL display a Dialog explaining the shortfall and SHALL NOT deduct any Coins.
7. THE App SHALL not offer any real-money purchases; all progression SHALL be achievable through gameplay.

---

### Requirement 13: Themes and Board Customization

**User Story:** As a player, I want to customize the look of the game, so that I can personalize my experience.

#### Acceptance Criteria

1. THE App SHALL support the following named Themes: Classic, Neon, Royal, Glass, Cyber, Nature, Minimal, Midnight, Retro, Future.
2. WHEN a Theme is applied, THE App SHALL update all colors, gradients, fonts, and glow effects site-wide without a page reload.
3. THE App SHALL support Board Customization options: grid style, border style, corner radius, glow intensity, and winning line style.
4. THE App SHALL support Piece Color customization: independent color selection for X and O from unlocked color packs, with a live preview.
5. WHEN a customization is changed, THE App SHALL persist the selection to Storage and apply it immediately.

---

### Requirement 14: Settings

**User Story:** As a player, I want persistent settings, so that the app behaves consistently across sessions.

#### Acceptance Criteria

1. THE Settings screen SHALL provide toggles for: Dark Mode / Light Mode, Animation on/off, Sound on/off, Music on/off, and Timer default on/off.
2. WHEN a Setting is changed, THE App SHALL apply the change immediately and persist it to Storage.
3. THE Settings screen SHALL provide a "Reset Progress" action that clears all Statistics, Achievements, Coins, and customizations after a confirmation Dialog.
4. THE Settings screen SHALL display the current app version.

---

### Requirement 15: Tutorial

**User Story:** As a new player, I want interactive tutorials for both game modes, so that I can learn the rules quickly.

#### Acceptance Criteria

1. THE Tutorial SHALL provide separate guided walkthroughs for Classic Tic-Tac-Toe and Ultimate Tic-Tac-Toe.
2. WHEN the tutorial step requires a player action, THE Tutorial SHALL highlight the valid interactive element and wait for that specific interaction before advancing.
3. THE Tutorial SHALL include a Practice Mode where the player can try moves freely without affecting Statistics.
4. WHEN the Tutorial is completed, THE App SHALL return the player to the Home screen.

---

### Requirement 16: About Screen

**User Story:** As a user, I want to see app information, so that I know who made it and what version I am using.

#### Acceptance Criteria

1. THE About screen SHALL display: developer name (Shivam Singh Rajpoot), institution (Madhav Institute of Technology and Science, MITS Gwalior), degree (B.Tech Mathematics and Computing), app version, credits, and a privacy notice.

---

### Requirement 17: Persistent Storage

**User Story:** As a player, I want my progress saved automatically, so that I never lose my data between sessions.

#### Acceptance Criteria

1. THE Storage module SHALL persist to localStorage: Statistics, Achievements, Coin balance, Settings, unlocked Themes, Piece Colors, and splash-seen flag.
2. WHEN the App loads, THE Storage module SHALL read all persisted values and restore the app to the last known state.
3. IF Storage data is corrupted or missing a key, THE Storage module SHALL fall back to the defined default value for that key without throwing an error.
4. THE Storage module SHALL expose typed `get(key)` and `set(key, value)` functions used by all other modules; no module SHALL access localStorage directly.

---

### Requirement 18: Performance and Quality

**User Story:** As a player, I want a fast, smooth experience, so that the app feels professional on all my devices.

#### Acceptance Criteria

1. THE App SHALL target 60 FPS for all animations on mid-range mobile hardware.
2. THE App total asset size SHALL remain under 25 MB.
3. THE App SHALL be fully responsive and usable on screens from 320 px to 1920 px wide.
4. THE App SHALL function offline after the first load (PWA-ready service worker or equivalent cache strategy).
5. THE App SHALL pass WCAG 2.1 AA color contrast requirements for all text and interactive elements.
6. THE App SHALL support keyboard navigation for all interactive controls.

---

### Requirement 19: Modular Code Architecture

**User Story:** As a developer, I want a modular, readable codebase, so that the project is maintainable and extensible.

#### Acceptance Criteria

1. WHEN functionality is grouped, THE App SHALL separate concerns into distinct JS modules: `main.js` (navigation/bootstrap), `classic.js` (Classic game logic), `ultimate.js` (Ultimate game logic), `ai.js` (AI engine), `statistics.js`, `achievements.js`, `storage.js`, `settings.js`, `theme.js`, `sound.js`, `timer.js`, `hint.js`, `replay.js`, and `tutorial.js`.
2. WHEN a module requires data from another module, THE module SHALL import it through a defined interface rather than accessing globals directly.
3. THE codebase SHALL contain no unused placeholder UI — every screen referenced in navigation SHALL be fully implemented.
