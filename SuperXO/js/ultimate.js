/**
 * ultimate.js — Ultimate Tic-Tac-Toe game logic.
 * 9 local boards, active-board routing, global win detection.
 */
import { AI } from './ai.js';
import { Timer } from './timer.js';
import { Replay } from './replay.js';
import { Statistics } from './statistics.js';
import { Achievements } from './achievements.js';
import { Sound } from './sound.js';
import { Storage } from './storage.js';
import { showDialog, showToast, navigate, navigateClean, updateTurnGlow } from './main.js';
import { getDifficultyController } from './difficultyController.js';
import { getPlayerModel } from './playerModel.js';

const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

let state = {};
let dom = {};

function defaultState() {
  return {
    boards: Array(9).fill(null).map(() => Array(9).fill(null)),
    boardWinners: Array(9).fill(null),
    globalBoard: Array(9).fill(null),
    activeBoard: null,
    currentPlayer: 'X',
    gameOver: false,
    scores: { X: 0, O: 0, draw: 0 },
    moveHistory: [],
    startTime: Date.now(),
    mode: 'hvh',
    vsAI: false,
    aiPlayer: 'O',
    difficulty: 'medium',
    players: { X: 'Player 1', O: 'Player 2' },
    timerEnabled: false,
    timerDuration: 30,
    hintsRemaining: 3,   // 3 hints per game
    gameAnalysis: null,
    lastMoveTime: Date.now(),
  };
}

// ── DOM setup ─────────────────────────────────────────
function buildBoard() {
  const container = document.getElementById('ultimateBoard');
  container.innerHTML = '';
  for (let b = 0; b < 9; b++) {
    const localWrap = document.createElement('div');
    localWrap.className = 'local-board';
    localWrap.dataset.board = b;

    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'ult-cell';
      cell.dataset.board = b;
      cell.dataset.cell = c;
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Board ${b + 1}, Cell ${c + 1}`);
      localWrap.appendChild(cell);
    }

    // Win overlay
    const overlay = document.createElement('div');
    overlay.className = 'local-board-won-overlay';
    overlay.dataset.board = b;
    localWrap.appendChild(overlay);

    container.appendChild(localWrap);
  }
  container.addEventListener('click', handleBoardClick);
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const cell = e.target.closest('.ult-cell');
      if (cell) { e.preventDefault(); handleBoardClick(e); }
    }
  });
}

function initDOM() {
  dom = {
    container:    document.getElementById('ultimateBoard'),
    p1Name:       document.getElementById('ultimateP1Name'),
    p2Name:       document.getElementById('ultimateP2Name'),
    scoreX:       document.getElementById('ultimateScoreX'),
    scoreO:       document.getElementById('ultimateScoreO'),
    scoreDraw:    document.getElementById('ultimateScoreDraw'),
    turnIndicator:document.getElementById('ultimateTurnIndicator'),
    turnText:     document.getElementById('ultimateTurnText'),
    timerDisplay: document.getElementById('ultimateTimerDisplay'),
    timerRing:    document.getElementById('ultimateTimerRing'),
    timerCount:   document.getElementById('ultimateTimerCount'),
    aiThinking:   document.getElementById('uAiThinking'),
    undoBtn:      document.getElementById('ultimateUndoBtn'),
    hintBtn:      document.getElementById('ultimateHintBtn'),
    hintCount:    document.getElementById('ultimateHintCount'),
    restartBtn:   document.getElementById('ultimateRestartBtn'),
    replayBtn:    document.getElementById('ultimateReplayBtn'),
    backBtn:      document.getElementById('ultimateBackBtn'),
  };
}

// ── Init ─────────────────────────────────────────────
function init(config) {
  initDOM();
  state = defaultState();
  state.players.X = config.p1 || 'Player 1';
  state.players.O = config.p2 || 'Player 2';
  state.mode = config.mode || 'hvh';
  state.vsAI = config.mode === 'hvai';
  state.difficulty = config.difficulty || 'medium';
  state.timerEnabled = config.timerEnabled || false;
  state.timerDuration = config.timerDuration || 30;
  state.aiPlayer = 'O';

  buildBoard();
  renderAll();
  dom.replayBtn.disabled = true;
  updateActionButtons();

  // Initialize game analysis for AI games (TEMPORARILY DISABLED)
  if (state.vsAI) {
    try {
      // state.gameAnalysis = startGameAnalysis('ultimate', state.players, true, state.difficulty);
      state.gameAnalysis = null;
    } catch (e) {
      console.warn('Game analysis disabled:', e);
      state.gameAnalysis = null;
    }
  }
  
  state.lastMoveTime = Date.now();

  if (state.timerEnabled) {
    if (dom.timerDisplay) dom.timerDisplay.style.display = '';
    startTurnTimer();
  } else {
    if (dom.timerDisplay) dom.timerDisplay.style.display = 'none';
  }

  if (state.vsAI && state.currentPlayer === state.aiPlayer) scheduleAIMove();
}

// ── Rendering ─────────────────────────────────────────
function renderAll() {
  const colors = Storage.get('pieceColors');
  dom.p1Name.textContent = state.players.X;
  dom.p2Name.textContent = state.players.O;
  renderScores();
  updateTurnIndicator();

  for (let b = 0; b < 9; b++) {
    const localEl = dom.container.querySelector(`.local-board[data-board="${b}"]`);
    if (!localEl) continue;

    // Set active/inactive highlight
    const isActive = state.activeBoard === null
      ? state.boardWinners[b] === null
      : state.activeBoard === b;

    localEl.classList.toggle('active-board', isActive && !state.gameOver);
    localEl.classList.toggle('inactive-board', !isActive || state.gameOver);
    localEl.classList.toggle('board-won', !!state.boardWinners[b]);

    // Render cells
    for (let c = 0; c < 9; c++) {
      const cell = localEl.querySelector(`.ult-cell[data-cell="${c}"]`);
      if (!cell) continue;
      const val = state.boards[b][c];
      cell.textContent = val || '';
      cell.classList.toggle('player-x', val === 'X');
      cell.classList.toggle('player-o', val === 'O');
      cell.style.setProperty('--x-color', colors.x);
      cell.style.setProperty('--o-color', colors.o);
    }

    // Render local board winner overlay
    const overlay = localEl.querySelector('.local-board-won-overlay');
    if (overlay) {
      const w = state.boardWinners[b];
      overlay.textContent = w === 'draw' ? '—' : (w || '');
      overlay.classList.toggle('visible', !!w);
      overlay.classList.toggle('player-x', w === 'X');
      overlay.classList.toggle('player-o', w === 'O');
      overlay.classList.toggle('draw-board', w === 'draw');
    }
  }
}

function renderScores() {
  dom.scoreX.textContent = state.scores.X;
  dom.scoreO.textContent = state.scores.O;
  dom.scoreDraw.textContent = state.scores.draw;
}

function updateTurnIndicator() {
  const name = state.players[state.currentPlayer];
  dom.turnText.textContent = `${name}'s turn (${state.currentPlayer})`;
  updateTurnGlow('ultimateTurnIndicator', state.currentPlayer);
}

// ── Click handling ────────────────────────────────────
function handleBoardClick(e) {
  const cell = e.target.closest('.ult-cell');
  if (!cell) return;
  const boardIdx = Number(cell.dataset.board);
  const cellIdx = Number(cell.dataset.cell);
  handleCellClick(boardIdx, cellIdx);
}

function handleCellClick(boardIdx, cellIdx) {
  if (state.gameOver) return;
  if (state.vsAI && state.currentPlayer === state.aiPlayer) return;

  if (!isCellPlayable(boardIdx, cellIdx)) {
    Sound.play('error');
    return;
  }

  placeMove(boardIdx, cellIdx, state.currentPlayer);
}

function isCellPlayable(boardIdx, cellIdx) {
  if (state.boardWinners[boardIdx] !== null) return false;
  if (state.boards[boardIdx][cellIdx] !== null) return false;
  if (state.activeBoard !== null && state.activeBoard !== boardIdx) return false;
  return true;
}

function placeMove(boardIdx, cellIdx, player) {
  // Record move analysis for human players in AI games
  if (state.vsAI && state.gameAnalysis && player !== state.aiPlayer) {
    const timeSpent = Date.now() - state.lastMoveTime;
    const stateBeforeMove = {
      boards: state.boards.map(b => [...b]),
      boardWinners: [...state.boardWinners],
      globalBoard: [...state.globalBoard],
      activeBoard: state.activeBoard,
    };
    const move = { b: boardIdx, c: cellIdx };
    state.gameAnalysis.recordMove(stateBeforeMove, move, player, timeSpent);
  }
  
  state.boards[boardIdx][cellIdx] = player;
  state.moveHistory.push({ player, localBoard: boardIdx, cell: cellIdx, timestamp: Date.now() - state.startTime });
  state.lastMoveTime = Date.now();
  Sound.play('place');

  // Check local board win
  const localResult = checkBoard(state.boards[boardIdx]);
  if (localResult === 'X' || localResult === 'O') {
    state.boardWinners[boardIdx] = localResult;
    state.globalBoard[boardIdx] = localResult;
    // Check global win
    const globalWinner = checkBoard(state.globalBoard);
    if (globalWinner === 'X' || globalWinner === 'O') {
      renderAll();
      handleGlobalWin(globalWinner);
      return;
    }
  } else if (localResult === 'draw') {
    state.boardWinners[boardIdx] = 'draw';
    state.globalBoard[boardIdx] = 'draw';
    // Check for global draw (all boards resolved)
    if (state.boardWinners.every(w => w !== null)) {
      const gw = checkBoard(state.globalBoard.map(v => v === 'draw' ? null : v));
      if (gw === 'X' || gw === 'O') {
        renderAll();
        handleGlobalWin(gw);
        return;
      }
      renderAll();
      handleGlobalDraw();
      return;
    }
  }

  // Route active board
  const nextActive = cellIdx;
  if (state.boardWinners[nextActive] !== null) {
    state.activeBoard = null; // free choice
  } else {
    state.activeBoard = nextActive;
  }

  renderAll();
  switchTurn();
}

function checkBoard(board) {
  for (const [a, b, c] of WIN_PATTERNS) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
  }
  if (board.every(v => v !== null)) return 'draw';
  return null;
}

function handleGlobalWin(winner) {
  state.gameOver = true;
  state.scores[winner]++;
  Timer.stop();
  Sound.play('win');
  renderScores();
  dom.replayBtn.disabled = false;

  setTimeout(() => {
    endGame(winner);
  }, 800);
}

function handleGlobalDraw() {
  state.gameOver = true;
  state.scores.draw++;
  Timer.stop();
  Sound.play('draw');
  renderScores();
  dom.replayBtn.disabled = false;

  setTimeout(() => {
    endGame('draw');
  }, 800);
}

function endGame(result) {
  const duration = Math.round((Date.now() - state.startTime) / 1000);

  // Check special achievement conditions
  const beatImpossible = state.vsAI &&
    result !== 'draw' &&
    result !== state.aiPlayer &&
    state.difficulty === 'impossible';

  // Update player model for adaptive AI
  let ratingChange = null;
  if (state.vsAI) {
    try {
      const playerModel = getPlayerModel();
      const controller = getDifficultyController();
      
      // Determine result from human player's perspective
      const humanPlayer = state.aiPlayer === 'O' ? 'X' : 'O';
      let gameResult;
      if (result === humanPlayer) gameResult = 'win';
      else if (result === 'draw') gameResult = 'draw';
      else gameResult = 'loss';
      
      // Estimate opponent strength based on difficulty
      const opponentStrength = estimateAIStrength(state.difficulty);
      
      // Update rating
      ratingChange = playerModel.updateRating('ultimate', gameResult, opponentStrength, 0.5);
      playerModel.incrementGameCount('ultimate');
      controller.recordGameComplete();
      
      console.log('[Ultimate] Updated player rating:', ratingChange);
    } catch (error) {
      console.warn('[Ultimate] Error updating player model:', error);
    }
  }

  const statsResult = {
    mode: 'ultimate',
    winner: result,
    humanPlayer: state.vsAI ? (state.aiPlayer === 'O' ? 'X' : 'O') : 'X',
    players: state.players,
    duration,
    vsAI: state.vsAI,
    difficulty: state.vsAI ? state.difficulty : null,
    moveCount: state.moveHistory.length,
    beatImpossible,
  };

  const coinsEarned = Statistics.record(statsResult);
  const stats = Statistics.get();

  // Persist special flags for achievement checks (mirrors classic.js logic)
  if (beatImpossible) stats.beatImpossible = true;
  Storage.set('statistics', stats);

  Achievements.check(stats, showToast);
  updateCoinDisplay();

  const resultName = result === 'draw' ? '🤝 It\'s a Draw!' : `🏆 ${state.players[result]} wins!`;
  const coinMsg = coinsEarned > 0 ? `\n+${coinsEarned} 🪙 coins earned!` : '';
  
  // Add rating change message for adaptive AI
  let ratingMsg = '';
  if (ratingChange) {
    const sign = ratingChange.ratingChange >= 0 ? '+' : '';
    ratingMsg = `\n📊 Rating: ${ratingChange.ratingBefore} → ${ratingChange.ratingAfter} (${sign}${ratingChange.ratingChange})`;
  }
  
  const durationMsg = `⏱ ${Math.floor(duration / 60)}m ${duration % 60}s  ·  ${state.moveHistory.length} moves`;
  
  if (result !== 'draw') spawnConfetti();
  showDialog('Game Over', `${resultName}${coinMsg}${ratingMsg}\n\n${durationMsg}`, [
    { label: '🔄 Rematch', action: () => restartGame() },
    { label: '🏠 Menu', action: () => navigateClean('gameSelectScreen') },
    { label: '▶ Replay', action: () => openReplay() },
  ]);
}

function updateCoinDisplay() {
  const coins = Storage.get('coins');
  const homeBal = document.getElementById('homeCoinBalance');
  const achBal = document.getElementById('achCoinBalance');
  if (homeBal) homeBal.textContent = coins;
  if (achBal) achBal.textContent = coins;
}

// ── AI Move — uses difficulty levels ──────────────────
function scheduleAIMove() {
  if (state.gameOver) return;
  dom.aiThinking.style.display = '';
  const delay = 400 + Math.random() * 400;
  setTimeout(() => {
    if (state.gameOver) { dom.aiThinking.style.display = 'none'; return; }
    dom.aiThinking.style.display = 'none';

    let move;
    if (state.difficulty === 'adaptive') {
      try {
        // Use adaptive difficulty controller
        const controller = getDifficultyController();
        const adaptiveProfile = controller.getAdaptiveProfile('ultimate');
        const ultimateState = {
          boards: state.boards,
          boardWinners: state.boardWinners,
          globalBoard: state.globalBoard,
          activeBoard: state.activeBoard,
        };
        move = AI.getUltimateBestMove(ultimateState, state.aiPlayer, 'adaptive', adaptiveProfile);
        console.log('[Ultimate] Using adaptive profile:', adaptiveProfile);
      } catch (error) {
        console.warn('[Ultimate] Adaptive difficulty failed, using medium:', error);
        const ultimateState = {
          boards: state.boards,
          boardWinners: state.boardWinners,
          globalBoard: state.globalBoard,
          activeBoard: state.activeBoard,
        };
        move = AI.getUltimateBestMove(ultimateState, state.aiPlayer, 'medium');
      }
    } else {
      move = getBestUltimateMove();
    }
    
    if (move) {
      // Handle both formats: {b, c} and {boardIndex, cellIndex}
      const boardIdx = move.b !== undefined ? move.b : move.boardIndex;
      const cellIdx = move.c !== undefined ? move.c : move.cellIndex;
      placeMove(boardIdx, cellIdx, state.aiPlayer);
    }
  }, delay);
}

/**
 * Pick the best move for the AI in Ultimate mode using enhanced strategy engine.
 * @returns {{ boardIndex: number, cellIndex: number } | null}
 */
function getBestUltimateMove() {
  // Build Ultimate state object for strategy engine
  const ultimateState = {
    boards: state.boards,
    boardWinners: state.boardWinners,
    globalBoard: state.globalBoard,
    activeBoard: state.activeBoard,
  };

  // Use enhanced AI with proper difficulty
  const move = AI.getUltimateBestMove(ultimateState, state.aiPlayer, state.difficulty);
  
  // Ensure consistent format {boardIndex, cellIndex}
  if (move && move.b !== undefined) {
    return { boardIndex: move.b, cellIndex: move.c };
  }
  
  return move;
}

// ── Action button state ───────────────────────────────
function updateActionButtons() {
  if (!dom.undoBtn) return;
  const isHvH = !state.vsAI;
  // Undo: only HvH, at least one move played, game not over
  dom.undoBtn.disabled = !(isHvH && state.moveHistory.length > 0 && !state.gameOver);
  // Hint: game not over, hints remaining
  if (dom.hintBtn)   dom.hintBtn.disabled = state.gameOver || state.hintsRemaining <= 0;
  if (dom.hintCount) dom.hintCount.textContent = `(${state.hintsRemaining})`;
}

// ── Undo ─────────────────────────────────────────────
function undo() {
  if (state.vsAI || state.moveHistory.length === 0 || state.gameOver) return;

  const last = state.moveHistory.pop();
  if (!last) return;

  // Clear the cell
  state.boards[last.localBoard][last.cell] = null;

  // We need to fully recompute boardWinners and globalBoard from scratch
  // because undoing a move might un-win a local board
  state.boardWinners = Array(9).fill(null);
  state.globalBoard  = Array(9).fill(null);

  for (let b = 0; b < 9; b++) {
    const result = checkBoard(state.boards[b]);
    if (result === 'X' || result === 'O') {
      state.boardWinners[b] = result;
      state.globalBoard[b]  = result;
    } else if (result === 'draw') {
      state.boardWinners[b] = 'draw';
      state.globalBoard[b]  = 'draw';
    }
  }

  // Restore activeBoard: it was determined by the move BEFORE last.
  // Re-derive from the new last move in history.
  if (state.moveHistory.length === 0) {
    state.activeBoard = null; // first move — free choice
  } else {
    const prev = state.moveHistory[state.moveHistory.length - 1];
    const targetBoard = prev.cell;
    state.activeBoard = state.boardWinners[targetBoard] !== null ? null : targetBoard;
  }

  // Restore whose turn it is
  state.currentPlayer = last.player;

  renderAll();
  updateActionButtons();
  Sound.play('click');
}

// ── Hint ─────────────────────────────────────────────
function requestHint() {
  if (state.gameOver || state.hintsRemaining <= 0) return;

  // Collect all playable cells
  const playable = [];
  for (let b = 0; b < 9; b++) {
    for (let c = 0; c < 9; c++) {
      if (isCellPlayable(b, c)) playable.push({ b, c });
    }
  }
  if (playable.length === 0) return;

  // Heuristic: find the best move
  // Priority 1 — move that wins a local board immediately
  // Priority 2 — AI best move within the most contested active board
  // Priority 3 — random playable cell (fallback)
  let hintBoard = -1;
  let hintCell  = -1;

  // Priority 1: find a winning move in any playable local board
  for (const { b, c } of playable) {
    const testBoard = [...state.boards[b]];
    testBoard[c] = state.currentPlayer;
    if (checkBoard(testBoard) === state.currentPlayer) {
      hintBoard = b;
      hintCell  = c;
      break;
    }
  }

  // Priority 2: use AI on the active board (or pick first active board)
  if (hintBoard === -1) {
    const activeBoardIdx = state.activeBoard !== null
      ? state.activeBoard
      : playable[0].b; // first available

    const boardForAI = state.boards[activeBoardIdx];
    const playableCells = boardForAI.map((v, i) =>
      isCellPlayable(activeBoardIdx, i) ? i : null
    ).filter(i => i !== null);

    if (playableCells.length > 0) {
      // Use AI engine on this local board
      const aiIdx = AI.getBestMove([...boardForAI], 'impossible', state.currentPlayer);
      if (aiIdx !== null && isCellPlayable(activeBoardIdx, aiIdx)) {
        hintBoard = activeBoardIdx;
        hintCell  = aiIdx;
      } else {
        hintBoard = activeBoardIdx;
        hintCell  = playableCells[0];
      }
    }
  }

  // Fallback
  if (hintBoard === -1) {
    hintBoard = playable[0].b;
    hintCell  = playable[0].c;
  }

  // Consume one hint
  state.hintsRemaining--;
  updateActionButtons();
  Sound.play('click');

  // Highlight the hinted cell
  _clearHint();
  const localEl = dom.container.querySelector(`.local-board[data-board="${hintBoard}"]`);
  if (localEl) {
    const cellEl = localEl.querySelector(`.ult-cell[data-cell="${hintCell}"]`);
    if (cellEl) {
      cellEl.classList.add('ult-hint-cell');
      // Auto-clear after 2s
      setTimeout(() => cellEl.classList.remove('ult-hint-cell'), 2000);
    }
  }

  if (state.hintsRemaining <= 0) {
    showToast('No hints left', 'You\'ve used all 3 hints for this game.');
  }
}

function _clearHint() {
  dom.container.querySelectorAll('.ult-hint-cell').forEach(el => el.classList.remove('ult-hint-cell'));
}

// ── Turn switch ───────────────────────────────────────
function switchTurn() {
  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  state.lastMoveTime = Date.now();
  updateTurnIndicator();
  updateActionButtons();
  if (state.timerEnabled) startTurnTimer();
  if (state.vsAI && state.currentPlayer === state.aiPlayer) scheduleAIMove();
}

function startTurnTimer() {
  Timer.start(
    state.timerDuration,
    (remaining) => {
      if (dom.timerCount) dom.timerCount.textContent = remaining;
      if (dom.timerRing) dom.timerRing.classList.toggle('urgent', remaining <= 5);
    },
    () => {
      // Forfeit turn on timeout
      Sound.play('error');
      if (!state.gameOver) switchTurn();
    }
  );
}

// ── Restart / Replay ─────────────────────────────────
function restartGame() {
  const config = {
    p1: state.players.X,
    p2: state.players.O,
    mode: state.mode,
    difficulty: state.difficulty,
    timerEnabled: state.timerEnabled,
    timerDuration: state.timerDuration,
  };
  init(config);
}

function openReplay() {
  Replay.load(state.moveHistory, 'ultimate');
  navigate('replayScreen');
}

function spawnConfetti() {
  const colors = ['#2dd4ff', '#7dff74', '#ff6b6b', '#ffd93d', '#a855f7', '#f97316'];
  for (let i = 0; i < 48; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    p.style.cssText = `
      left:${Math.random() * 100}vw;
      top:${Math.random() * 30 + 10}vh;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay:${Math.random() * 0.6}s;
      animation-duration:${1.2 + Math.random() * 0.6}s;
      transform:rotate(${Math.random() * 360}deg);
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 2400);
  }
}

// ── Event wiring ──────────────────────────────────────
export function wireUltimateEvents() {
  document.getElementById('ultimateUndoBtn').addEventListener('click', () => undo());

  document.getElementById('ultimateHintBtn').addEventListener('click', () => {
    if (state.hintsRemaining <= 0) {
      showDialog('No Hints Left', 'You have used all 3 hints for this game.', [
        { label: 'OK', action: null },
      ]);
      Sound.play('error');
      return;
    }
    requestHint();
  });

  document.getElementById('ultimateRestartBtn').addEventListener('click', () => {
    showDialog('Restart Game', 'Are you sure?', [
      { label: 'Yes', action: () => restartGame() },
      { label: 'No', action: null },
    ]);
  });

  document.getElementById('ultimateReplayBtn').addEventListener('click', () => openReplay());

  document.getElementById('ultimateBackBtn').addEventListener('click', () => {
    Timer.stop();
    if (!state.gameOver && state.moveHistory.length > 0) {
      showDialog('Leave Game?', 'Your current game progress will be lost.', [
        { label: 'Leave', action: () => navigateClean('gameSelectScreen') },
        { label: 'Stay', action: null },
      ]);
    } else {
      navigateClean('gameSelectScreen');
    }
  });
}

/**
 * Estimate AI strength rating based on difficulty level
 */
function estimateAIStrength(difficulty) {
  const strengthMap = {
    'beginner': 600,
    'easy': 900,
    'medium': 1200,
    'hard': 1500,
    'expert': 1800,
    'impossible': 2200,
    'adaptive': 1200, // Default for adaptive (will be adjusted)
  };
  return strengthMap[difficulty] || 1200;
}

export const Ultimate = { init };
