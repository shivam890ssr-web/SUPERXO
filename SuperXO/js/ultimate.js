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
import { showDialog, showToast, navigate } from './main.js';

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
    activeBoard: null, // null = any open board allowed
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
    container: document.getElementById('ultimateBoard'),
    p1Name: document.getElementById('ultimateP1Name'),
    p2Name: document.getElementById('ultimateP2Name'),
    scoreX: document.getElementById('ultimateScoreX'),
    scoreO: document.getElementById('ultimateScoreO'),
    scoreDraw: document.getElementById('ultimateScoreDraw'),
    turnText: document.getElementById('ultimateTurnText'),
    aiThinking: document.getElementById('uAiThinking'),
    restartBtn: document.getElementById('ultimateRestartBtn'),
    replayBtn: document.getElementById('ultimateReplayBtn'),
    backBtn: document.getElementById('ultimateBackBtn'),
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
  state.boards[boardIdx][cellIdx] = player;
  state.moveHistory.push({ player, localBoard: boardIdx, cell: cellIdx, timestamp: Date.now() - state.startTime });
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
  const statsResult = {
    mode: 'ultimate',
    winner: result,
    humanPlayer: state.vsAI ? (state.aiPlayer === 'O' ? 'X' : 'O') : 'X',
    players: state.players,
    duration,
    vsAI: state.vsAI,
    difficulty: state.vsAI ? state.difficulty : null,
    moveCount: state.moveHistory.length,
  };
  const coinsEarned = Statistics.record(statsResult);
  const stats = Statistics.get();
  Achievements.check(stats, showToast);
  updateCoinDisplay();

  const resultName = result === 'draw' ? 'Draw!' : `${state.players[result]} wins!`;
  const coinMsg = coinsEarned > 0 ? `\n+${coinsEarned} 🪙 coins earned!` : '';
  showDialog('Game Over', `${resultName}${coinMsg}`, [
    { label: 'Rematch', action: () => restartGame() },
    { label: 'Back to Menu', action: () => navigate('gameSelectScreen') },
    { label: 'View Replay', action: () => openReplay() },
  ]);
}

function updateCoinDisplay() {
  const coins = Storage.get('coins');
  const homeBal = document.getElementById('homeCoinBalance');
  const achBal = document.getElementById('achCoinBalance');
  if (homeBal) homeBal.textContent = coins;
  if (achBal) achBal.textContent = coins;
}

// ── AI Move ───────────────────────────────────────────
function scheduleAIMove() {
  if (state.gameOver) return;
  dom.aiThinking.style.display = '';
  const delay = 400 + Math.random() * 400;
  setTimeout(() => {
    if (state.gameOver) { dom.aiThinking.style.display = 'none'; return; }
    dom.aiThinking.style.display = 'none';
    // Find all playable cells
    const playable = [];
    for (let b = 0; b < 9; b++) {
      for (let c = 0; c < 9; c++) {
        if (isCellPlayable(b, c)) playable.push({ b, c });
      }
    }
    if (playable.length > 0) {
      const choice = playable[Math.floor(Math.random() * playable.length)];
      placeMove(choice.b, choice.c, state.aiPlayer);
    }
  }, delay);
}

// ── Turn switch ───────────────────────────────────────
function switchTurn() {
  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  updateTurnIndicator();
  if (state.vsAI && state.currentPlayer === state.aiPlayer) scheduleAIMove();
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

// ── Event wiring ──────────────────────────────────────
export function wireUltimateEvents() {
  document.getElementById('ultimateRestartBtn').addEventListener('click', () => {
    showDialog('Restart Game', 'Are you sure?', [
      { label: 'Yes', action: () => restartGame() },
      { label: 'No', action: null },
    ]);
  });
  document.getElementById('ultimateReplayBtn').addEventListener('click', () => openReplay());
  document.getElementById('ultimateBackBtn').addEventListener('click', () => {
    Timer.stop();
    navigate('gameSelectScreen');
  });
}

export const Ultimate = { init };
