/**
 * classic.js — Classic 3×3 Tic-Tac-Toe game logic and DOM management.
 */
import { AI } from './ai.js';
import { Hint, HintExhaustedError } from './hint.js';
import { Timer } from './timer.js';
import { Replay } from './replay.js';
import { Statistics } from './statistics.js';
import { Achievements } from './achievements.js';
import { Sound } from './sound.js';
import { Storage } from './storage.js';
import { showDialog, showToast, navigate } from './main.js';

export const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

// ── State ──────────────────────────────────────────────
let state = {};

function defaultState() {
  return {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    gameOver: false,
    scores: { X: 0, O: 0, draw: 0 },
    round: 1,
    totalRounds: 1,
    moveHistory: [],
    hintsRemaining: 3,
    undoAvailable: false,
    startTime: Date.now(),
    roundStartTime: Date.now(),
    mode: 'hvh',
    difficulty: 'medium',
    players: { X: 'Player 1', O: 'Player 2' },
    timerEnabled: false,
    timerDuration: 30,
    vsAI: false,
    aiPlayer: 'O',
    winnerThisMatch: null,
    matchOver: false,
    perfectGameCandidate: true, // true until opponent scores
    opponentScoredThisMatch: false,
  };
}

// ── DOM refs (populated by initDOM) ───────────────────
let dom = {};

function initDOM() {
  dom = {
    board: document.getElementById('classicBoard'),
    cells: document.querySelectorAll('.classic-cell'),
    p1Name: document.getElementById('classicP1Name'),
    p2Name: document.getElementById('classicP2Name'),
    scoreX: document.getElementById('classicScoreX'),
    scoreO: document.getElementById('classicScoreO'),
    scoreDraw: document.getElementById('classicScoreDraw'),
    roundInfo: document.getElementById('classicRoundInfo'),
    turnText: document.getElementById('classicTurnText'),
    timerDisplay: document.getElementById('classicTimerDisplay'),
    timerRing: document.getElementById('classicTimerRing'),
    timerCount: document.getElementById('classicTimerCount'),
    aiThinking: document.getElementById('aiThinking'),
    winLine: document.getElementById('classicWinLine'),
    undoBtn: document.getElementById('classicUndoBtn'),
    hintBtn: document.getElementById('classicHintBtn'),
    hintCount: document.getElementById('classicHintCount'),
    restartBtn: document.getElementById('classicRestartBtn'),
    replayBtn: document.getElementById('classicReplayBtn'),
    backBtn: document.getElementById('classicBackBtn'),
  };
}

// ── Init ───────────────────────────────────────────────
/**
 * Initialise a new Classic game.
 * @param {{ p1: string, p2: string, mode: string, difficulty: string, rounds: number, timerEnabled: boolean, timerDuration: number }} config
 */
function init(config) {
  initDOM();
  state = defaultState();
  state.players.X = config.p1 || 'Player 1';
  state.players.O = config.p2 || 'Player 2';
  state.mode = config.mode || 'hvh';
  state.vsAI = config.mode === 'hvai';
  state.difficulty = config.difficulty || 'medium';
  state.totalRounds = config.rounds || 1;
  state.timerEnabled = config.timerEnabled || false;
  state.timerDuration = config.timerDuration || 30;
  state.aiPlayer = 'O';

  renderNames();
  renderScores();
  renderBoard();
  renderRoundInfo();
  updateTurnIndicator();
  updateActionButtons();
  clearWinLine();

  dom.replayBtn.disabled = true;

  if (state.timerEnabled) {
    dom.timerDisplay.style.display = '';
    startTurnTimer();
  } else {
    dom.timerDisplay.style.display = 'none';
  }

  if (state.vsAI && state.currentPlayer === state.aiPlayer) {
    scheduleAIMove();
  }
}

// ── Rendering ─────────────────────────────────────────
function renderNames() {
  dom.p1Name.textContent = state.players.X;
  dom.p2Name.textContent = state.players.O;
}

function renderScores() {
  dom.scoreX.textContent = state.scores.X;
  dom.scoreO.textContent = state.scores.O;
  dom.scoreDraw.textContent = state.scores.draw;
}

function renderRoundInfo() {
  dom.roundInfo.textContent = `Round ${state.round} / ${state.totalRounds}`;
}

function renderBoard() {
  const colors = Storage.get('pieceColors');
  dom.cells.forEach((cell, i) => {
    cell.textContent = state.board[i] || '';
    cell.classList.toggle('player-x', state.board[i] === 'X');
    cell.classList.toggle('player-o', state.board[i] === 'O');
    cell.classList.remove('winner', 'hint-cell', 'just-placed');
    cell.style.setProperty('--x-color', colors.x);
    cell.style.setProperty('--o-color', colors.o);
  });
}

function updateTurnIndicator() {
  const name = state.players[state.currentPlayer];
  dom.turnText.textContent = `${name}'s turn (${state.currentPlayer})`;
  dom.board.dataset.currentPlayer = state.currentPlayer;
}

function updateActionButtons() {
  const isHvH = !state.vsAI;
  dom.undoBtn.disabled = !(isHvH && state.undoAvailable && !state.gameOver);
  dom.hintBtn.disabled = state.gameOver || state.hintsRemaining <= 0;
  dom.hintCount.textContent = `(${state.hintsRemaining})`;
}

// ── Cell click handler ────────────────────────────────
function handleCellClick(idx) {
  if (state.gameOver || state.matchOver) return;
  if (state.board[idx] !== null) { Sound.play('error'); return; }
  if (state.vsAI && state.currentPlayer === state.aiPlayer) return;

  placeMove(idx, state.currentPlayer);
}

function placeMove(idx, player) {
  state.board[idx] = player;
  state.moveHistory.push({ player, index: idx, timestamp: Date.now() - state.roundStartTime });
  state.undoAvailable = true;

  const cell = dom.cells[idx];
  cell.textContent = player;
  cell.classList.add('player-' + player.toLowerCase(), 'just-placed');
  Sound.play('place');

  updateActionButtons();

  const winner = checkWinner(state.board);
  if (winner === 'X' || winner === 'O') {
    handleRoundWin(winner);
  } else if (winner === 'draw') {
    handleRoundDraw();
  } else {
    switchTurn();
  }
}

// ── Win detection ─────────────────────────────────────
/**
 * Check the board for a winner or draw.
 * @param {Array} board — array[9]
 * @returns {'X'|'O'|'draw'|null}
 */
export function checkWinner(board) {
  for (const [a, b, c] of WIN_PATTERNS) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }
  if (board.every(v => v !== null)) return 'draw';
  return null;
}

function handleRoundWin(winner) {
  Timer.stop();
  state.gameOver = true;
  state.scores[winner]++;
  if (winner !== state.currentPlayer) {
    // shouldn't happen, but guard
  }

  // Perfect game tracking — if opponent scored this round, no longer perfect
  if (winner !== 'X') state.opponentScoredThisMatch = true; // 'O' won = X opponent scored? only for X's perspective
  // We'll set opponentScoredThisMatch if the losing player scored
  // Actually: perfectGame = one player won all rounds with 0 opponent wins
  // Track it after match

  // Animate win
  const pattern = WIN_PATTERNS.find(([a, b, c]) =>
    state.board[a] === winner && state.board[b] === winner && state.board[c] === winner
  );
  animateWin(pattern, winner);
  renderScores();
  Sound.play('win');

  updateActionButtons();
  dom.replayBtn.disabled = false;

  setTimeout(() => {
    checkMatchProgress(winner);
  }, 1200);
}

function handleRoundDraw() {
  Timer.stop();
  state.gameOver = true;
  state.scores.draw++;
  renderScores();
  Sound.play('draw');
  updateActionButtons();
  dom.replayBtn.disabled = false;

  setTimeout(() => checkMatchProgress('draw'), 1000);
}

function checkMatchProgress(roundResult) {
  const neededToWin = Math.ceil(state.totalRounds / 2);
  const xWins = state.scores.X;
  const oWins = state.scores.O;

  if (xWins >= neededToWin || oWins >= neededToWin || state.round >= state.totalRounds) {
    endMatch();
  } else {
    state.round++;
    const nextStarter = roundResult === 'draw'
      ? (state.currentPlayer === 'X' ? 'O' : 'X')
      : roundResult;
    startNextRound(nextStarter);
  }
}

function startNextRound(starterPlayer) {
  state.board = Array(9).fill(null);
  state.gameOver = false;
  state.currentPlayer = starterPlayer;
  state.undoAvailable = false;
  state.moveHistory = [];
  state.hintsRemaining = 3;
  state.roundStartTime = Date.now();

  clearWinLine();
  renderBoard();
  renderRoundInfo();
  updateTurnIndicator();
  updateActionButtons();

  if (state.timerEnabled) startTurnTimer();
  if (state.vsAI && state.currentPlayer === state.aiPlayer) scheduleAIMove();
}

function endMatch() {
  state.matchOver = true;
  Timer.stop();

  const xWins = state.scores.X;
  const oWins = state.scores.O;
  let matchWinner, resultText;

  if (xWins > oWins) {
    matchWinner = 'X';
    resultText = `🏆 ${state.players.X} wins the match!`;
  } else if (oWins > xWins) {
    matchWinner = 'O';
    resultText = `🏆 ${state.players.O} wins the match!`;
  } else {
    matchWinner = 'draw';
    resultText = `🤝 Match drawn!`;
  }

  const duration = Math.round((Date.now() - state.startTime) / 1000);

  // Perfect game check
  const perfectGame = matchWinner !== 'draw' &&
    ((matchWinner === 'X' && oWins === 0) || (matchWinner === 'O' && xWins === 0));

  // Persist statistics
  const statsResult = {
    mode: 'classic',
    winner: matchWinner,
    humanPlayer: state.vsAI ? (state.aiPlayer === 'O' ? 'X' : 'O') : 'X',
    players: state.players,
    duration,
    vsAI: state.vsAI,
    difficulty: state.vsAI ? state.difficulty : null,
    moveCount: state.moveHistory.length,
    perfectGame,
    beatImpossible: state.vsAI && matchWinner !== state.aiPlayer && state.difficulty === 'impossible',
  };

  const coinsEarned = Statistics.record(statsResult);
  const stats = Statistics.get();

  // Update stats for achievements
  if (perfectGame) stats.perfectGames = (stats.perfectGames || 0) + 1;
  if (statsResult.beatImpossible) stats.beatImpossible = true;
  Storage.set('statistics', stats);

  // Check achievements
  const newAch = Achievements.check(stats, showToast);

  // Update coin display
  updateCoinDisplay();

  const coinMsg = coinsEarned > 0 ? `\n+${coinsEarned} 🪙 coins earned!` : '';

  showDialog('Match Over', `${resultText}${coinMsg}\n\nX: ${xWins}  Draws: ${state.scores.draw}  O: ${oWins}`, [
    { label: 'Rematch', action: () => restartMatch() },
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
  if (state.gameOver || state.matchOver) return;
  dom.aiThinking.style.display = '';
  updateActionButtons();

  const delay = 400 + Math.random() * 400;
  setTimeout(() => {
    if (state.gameOver || state.matchOver) { dom.aiThinking.style.display = 'none'; return; }
    dom.aiThinking.style.display = 'none';
    const move = AI.getBestMove([...state.board], state.difficulty, state.aiPlayer);
    if (move !== null) placeMove(move, state.aiPlayer);
  }, delay);
}

// ── Turn management ───────────────────────────────────
function switchTurn() {
  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  state.undoAvailable = false;
  updateTurnIndicator();
  updateActionButtons();

  if (state.timerEnabled) startTurnTimer();
  if (state.vsAI && state.currentPlayer === state.aiPlayer) scheduleAIMove();
}

function startTurnTimer() {
  Timer.start(
    state.timerDuration,
    (remaining) => {
      dom.timerCount.textContent = remaining;
      dom.timerRing.classList.toggle('urgent', remaining <= 5);
    },
    () => {
      // Forfeit turn
      Sound.play('error');
      switchTurn();
    }
  );
}

// ── Undo ─────────────────────────────────────────────
function undo() {
  if (state.vsAI || !state.undoAvailable || state.gameOver) return;
  const last = state.moveHistory.pop();
  if (!last) return;
  state.board[last.index] = null;
  state.undoAvailable = false;
  state.currentPlayer = last.player;

  renderBoard();
  clearWinLine();
  updateTurnIndicator();
  updateActionButtons();
  Sound.play('click');
}

// ── Hint ──────────────────────────────────────────────
function requestHint() {
  if (state.gameOver) return;
  try {
    const { index, remaining } = Hint.request([...state.board], state.currentPlayer, state.hintsRemaining);
    state.hintsRemaining = remaining;
    // Highlight the hint cell
    dom.cells.forEach(c => c.classList.remove('hint-cell'));
    if (index !== null) dom.cells[index].classList.add('hint-cell');
    updateActionButtons();
    Sound.play('click');
    // Auto-clear hint highlight after 2s
    setTimeout(() => dom.cells.forEach(c => c.classList.remove('hint-cell')), 2000);
  } catch (e) {
    if (e instanceof HintExhaustedError) {
      showDialog('No Hints Left', 'You have used all 3 hints for this game.', [
        { label: 'OK', action: null }
      ]);
      Sound.play('error');
    }
  }
}

// ── Win animation ─────────────────────────────────────
function animateWin(pattern, winner) {
  if (!pattern) return;
  pattern.forEach(i => dom.cells[i].classList.add('winner'));
  drawWinLine(pattern, winner);
}

function drawWinLine(pattern, winner) {
  const svg = dom.winLine;
  svg.innerHTML = '';
  const [a, , c] = pattern;

  // Map cell index to SVG grid col,row (0-2)
  const col = i => i % 3 + 0.5;
  const row = i => Math.floor(i / 3) + 0.5;

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', col(a));
  line.setAttribute('y1', row(a));
  line.setAttribute('x2', col(c));
  line.setAttribute('y2', row(c));
  line.setAttribute('stroke', winner === 'X' ? 'var(--color-accent-1)' : 'var(--color-accent-2)');
  line.setAttribute('stroke-width', '0.12');
  line.setAttribute('stroke-linecap', 'round');
  line.classList.add('win-line-animate');
  svg.appendChild(line);
}

function clearWinLine() {
  if (dom.winLine) dom.winLine.innerHTML = '';
}

// ── Restart / Replay ─────────────────────────────────
function restartMatch() {
  const config = {
    p1: state.players.X,
    p2: state.players.O,
    mode: state.mode,
    difficulty: state.difficulty,
    rounds: state.totalRounds,
    timerEnabled: state.timerEnabled,
    timerDuration: state.timerDuration,
  };
  init(config);
}

function restart() {
  restartMatch();
}

function openReplay() {
  Replay.load(state.moveHistory, 'classic');
  navigate('replayScreen');
}

// ── Event wiring (called once) ────────────────────────
export function wireClassicEvents() {
  document.getElementById('classicBoard').addEventListener('click', (e) => {
    const cell = e.target.closest('.classic-cell');
    if (!cell) return;
    handleCellClick(Number(cell.dataset.idx));
  });

  // Keyboard support for board cells
  document.getElementById('classicBoard').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const cell = e.target.closest('.classic-cell');
      if (cell) { e.preventDefault(); handleCellClick(Number(cell.dataset.idx)); }
    }
  });

  document.getElementById('classicUndoBtn').addEventListener('click', () => undo());
  document.getElementById('classicHintBtn').addEventListener('click', () => requestHint());
  document.getElementById('classicRestartBtn').addEventListener('click', () => {
    showDialog('Restart Game', 'Are you sure you want to restart?', [
      { label: 'Yes', action: () => restart() },
      { label: 'No', action: null },
    ]);
  });
  document.getElementById('classicReplayBtn').addEventListener('click', () => openReplay());
  document.getElementById('classicBackBtn').addEventListener('click', () => {
    Timer.stop();
    navigate('gameSelectScreen');
  });
}

export const Classic = { init, checkWinner, handleCellClick, undo, requestHint, restart };
