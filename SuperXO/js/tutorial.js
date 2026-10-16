/**
 * tutorial.js — Interactive visual tutorial for Classic and Ultimate.
 * Each step has an instruction, optional demo board state,
 * optional highlighted cells, and optional required action.
 */
import { navigate } from './main.js';

// ── Classic tutorial steps ─────────────────────────────
// board: array[9] of null | 'X' | 'O'
// highlight: array of cell indices to highlight (green outline)
// winLine: array of 3 indices (drawn as a win line)
// waitForClick: user must click any empty cell to proceed

const CLASSIC_STEPS = [
  {
    instruction: '🎮 Classic Tic-Tac-Toe — Two players take turns placing X and O on a 3×3 grid.',
    board: null,
    highlight: [],
  },
  {
    instruction: '📍 On your turn, tap any empty cell to place your symbol. Here X goes first — try tapping a highlighted cell!',
    board: [null,null,null, null,null,null, null,null,null],
    highlight: [0,1,2,3,4,5,6,7,8],
    waitForClick: true,
  },
  {
    instruction: '➡️ Players alternate turns. X places, then O places, back and forth.',
    board: ['X','O','X', 'O','X',null, null,null,null],
    highlight: [],
  },
  {
    instruction: '🏆 Win by placing 3 of your symbols in a horizontal row — like X across the top!',
    board: ['X','X','X', 'O','O',null, null,null,null],
    highlight: [0,1,2],
    winLine: [0, 2],
  },
  {
    instruction: '🏆 Or a vertical column — X wins down the left side!',
    board: ['X','O',null, 'X','O',null, 'X',null,null],
    highlight: [0,3,6],
    winLine: [0, 6],
  },
  {
    instruction: '🏆 Or a diagonal — X wins corner to corner!',
    board: ['X','O',null, 'O','X',null, null,null,'X'],
    highlight: [0,4,8],
    winLine: [0, 8],
  },
  {
    instruction: '🤝 If all 9 cells are filled with no winner — it\'s a draw! No one wins this round.',
    board: ['X','O','X', 'X','X','O', 'O','X','O'],
    highlight: [],
  },
  {
    instruction: '💡 Strategy tip: always take the centre (middle cell) on your first move — it gives you the most winning paths!',
    board: [null,null,null, null,'X',null, null,null,null],
    highlight: [4],
  },
  {
    instruction: '✅ You\'re ready! Use Practice Mode below to play freely, or exit and start a real game.',
    board: null,
    highlight: [],
  },
];

// ── Ultimate tutorial steps ────────────────────────────
const ULTIMATE_STEPS = [
  {
    instruction: '👑 Ultimate Tic-Tac-Toe — 9 small Tic-Tac-Toe boards arranged in a 3×3 outer grid. Win 3 small boards in a row to win overall.',
    board: null,
    highlight: [],
  },
  {
    instruction: '📍 The KEY RULE: where you play inside a local board determines which local board your opponent must play in next turn.',
    board: null,
    highlight: [],
  },
  {
    instruction: '🔵 Example: if you play in cell 5 (centre) of any local board, your opponent MUST play in local board 5 (the centre board).',
    board: null,
    highlight: [],
    showBoardRoute: true,
  },
  {
    instruction: '✨ The highlighted board is where you MUST play. If that board is already won or full, you can play anywhere.',
    board: null,
    highlight: [],
  },
  {
    instruction: '🏅 Win a local board by getting 3 in a row inside it — just like Classic. The winning symbol marks that position on the outer board.',
    board: null,
    highlight: [],
  },
  {
    instruction: '🏆 Win 3 local boards in a row on the outer grid (horizontal, vertical or diagonal) — that wins the whole game!',
    board: null,
    highlight: [],
  },
  {
    instruction: '✅ You\'ve got the rules! Use Practice Mode or exit to play a real game.',
    board: null,
    highlight: [],
  },
];

// ── State ──────────────────────────────────────────────
let _steps = [];
let _currentStep = 0;
let _practiceBoard = [];
let _practicePlayer = 'X';
let _awaitingClick = false;
let _tutDom = null;

// ── DOM helpers ────────────────────────────────────────
function initDOM() {
  _tutDom = {
    indicator:   document.getElementById('tutStepIndicator'),
    instruction: document.getElementById('tutInstruction'),
    boardWrap:   document.getElementById('tutBoardWrap'),
    prevBtn:     document.getElementById('tutPrevBtn'),
    nextBtn:     document.getElementById('tutNextBtn'),
    practiceBtn: document.getElementById('tutPracticeBtn'),
    exitBtn:     document.getElementById('tutExitBtn'),
  };
  return _tutDom;
}

// Build a visual 3×3 demo board for Classic tutorial
function buildDemoBoard(dom, step) {
  dom.boardWrap.innerHTML = '';

  if (!step.board && !step.showBoardRoute) {
    // No board for this step — show a visual placeholder
    const msg = document.createElement('p');
    msg.style.cssText = 'text-align:center;opacity:.5;font-style:italic;padding:20px 0;font-size:14px;';
    msg.textContent = 'Read the instruction above, then press Next →';
    dom.boardWrap.appendChild(msg);
    return;
  }

  if (step.showBoardRoute) {
    buildBoardRouteDemo(dom);
    return;
  }

  const boardEl = document.createElement('div');
  boardEl.className = 'tut-board';

  const board = step.board || Array(9).fill(null);

  board.forEach((val, i) => {
    const cell = document.createElement('div');
    cell.className = 'tut-cell';
    cell.dataset.idx = i;

    if (val) {
      cell.textContent = val;
      cell.classList.add('player-' + val.toLowerCase());
    }

    // Highlight certain cells
    if (step.highlight && step.highlight.includes(i) && !val) {
      cell.style.outline = '2px solid var(--color-accent-2)';
      cell.style.background = 'color-mix(in srgb,var(--color-accent-2) 12%,var(--cell-bg,#070c1a))';
    }

    // Win cells glow
    if (step.winLine) {
      const [a, c] = step.winLine;
      const pat = getWinPattern(step.highlight);
      if (pat && pat.includes(i) && val) {
        cell.classList.add('demo-win');
      }
    }

    // Clickable in waitForClick steps
    if (step.waitForClick && !val) {
      cell.style.cursor = 'pointer';
      cell.addEventListener('click', () => {
        if (!_awaitingClick) return;
        if (val) return;
        cell.textContent = 'X';
        cell.classList.add('player-x', 'just-placed');
        _awaitingClick = false;
        _tutDom.nextBtn.disabled = false;
        _tutDom.instruction.textContent = '✅ ' + step.instruction.replace(/^📍 /, '');
      }, { once: true });
    }

    boardEl.appendChild(cell);
  });

    // Draw win line overlay if specified
  if (step.winLine) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('win-line-svg');
    svg.setAttribute('viewBox', '0 0 3 3');
    svg.setAttribute('aria-hidden', 'true');

    const startIdx = step.winLine[0];
    const endIdx = step.winLine[1];
    const col = idx => idx % 3 + 0.5;
    const row = idx => Math.floor(idx / 3) + 0.5;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', col(startIdx)); line.setAttribute('y1', row(startIdx));
    line.setAttribute('x2', col(endIdx)); line.setAttribute('y2', row(endIdx));
    line.setAttribute('stroke', 'var(--color-accent-1)');
    line.setAttribute('stroke-width', '0.14');
    line.setAttribute('stroke-linecap', 'round');
    line.classList.add('win-line-animate');
    svg.appendChild(line);
    boardEl.style.position = 'relative';
    boardEl.appendChild(svg);
  }

  dom.boardWrap.appendChild(boardEl);
}

function getWinPattern(highlight) {
  if (!highlight || highlight.length !== 3) return null;
  return highlight;
}

// Mini board-routing diagram for Ultimate tutorial
function buildBoardRouteDemo(dom) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 0;';

  const label1 = document.createElement('p');
  label1.style.cssText = 'font-size:12px;opacity:.7;text-align:center;';
  label1.textContent = 'You play in cell 5 (centre) of a local board →';

  // Tiny local board diagram
  const miniBoard = document.createElement('div');
  miniBoard.style.cssText = `
    display:grid;grid-template-columns:repeat(3,1fr);
    gap:2px;background:rgba(45,212,255,.2);
    border-radius:8px;overflow:hidden;border:2px solid var(--color-accent-1);
    width:90px;height:90px;
  `;
  for (let i = 0; i < 9; i++) {
    const c = document.createElement('div');
    c.style.cssText = `
      background:#070c1a;display:flex;align-items:center;justify-content:center;
      font-size:16px;font-weight:800;
    `;
    if (i === 4) {
      c.textContent = 'X';
      c.style.color = 'var(--color-accent-1)';
      c.style.background = 'color-mix(in srgb,var(--color-accent-1) 18%,#070c1a)';
      c.style.textShadow = '0 0 8px var(--color-accent-1)';
    }
    miniBoard.appendChild(c);
  }

  const arrow = document.createElement('p');
  arrow.style.cssText = 'font-size:20px;';
  arrow.textContent = '↓';

  const label2 = document.createElement('p');
  label2.style.cssText = 'font-size:12px;opacity:.7;text-align:center;';
  label2.textContent = '→ Opponent must play in local board 5 (centre board)';

  // Mini outer board showing active board 5
  const outerBoard = document.createElement('div');
  outerBoard.style.cssText = `
    display:grid;grid-template-columns:repeat(3,1fr);
    gap:3px;background:rgba(45,212,255,.25);
    border-radius:10px;overflow:hidden;border:2px solid var(--color-accent-1);
    width:120px;height:120px;
  `;
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('div');
    b.style.cssText = `
      background:#06090f;border-radius:2px;
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:700;
    `;
    if (i === 4) {
      b.style.background = 'color-mix(in srgb,var(--color-accent-1) 22%,#06090f)';
      b.style.outline = '2px solid var(--color-accent-1)';
      b.textContent = '▶';
      b.style.color = 'var(--color-accent-1)';
    } else {
      b.style.opacity = '.35';
    }
    outerBoard.appendChild(b);
  }

  wrap.append(label1, miniBoard, arrow, label2, outerBoard);
  dom.boardWrap.appendChild(wrap);
}

// ── Render a step ──────────────────────────────────────
function renderStep(dom, step) {
  if (!step) return;
  dom.indicator.textContent = `Step ${_currentStep + 1} / ${_steps.length}`;
  dom.instruction.textContent = step.instruction;
  dom.prevBtn.disabled = _currentStep === 0;

  _awaitingClick = step.waitForClick || false;
  dom.nextBtn.disabled = _awaitingClick;

  // Update progress fill
  const progressFill = document.getElementById('tutProgressFill');
  if (progressFill) {
    const pct = _steps.length > 1 ? (_currentStep / (_steps.length - 1)) * 100 : 100;
    progressFill.style.width = `${pct}%`;
  }

  buildDemoBoard(dom, step);
}

// ── Practice mode board ────────────────────────────────
function buildPracticeBoard(dom) {
  dom.boardWrap.innerHTML = '';
  const boardEl = document.createElement('div');
  boardEl.className = 'tut-board';

  _practiceBoard = Array(9).fill(null);
  _practicePlayer = 'X';

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'tut-cell';
    cell.dataset.idx = i;
    cell.addEventListener('click', () => {
      if (_practiceBoard[i]) return;
      _practiceBoard[i] = _practicePlayer;
      cell.textContent = _practicePlayer;
      cell.classList.add('player-' + _practicePlayer.toLowerCase(), 'just-placed');
      _practicePlayer = _practicePlayer === 'X' ? 'O' : 'X';
      // Check for win in practice
      const win = checkPracticeWin(_practiceBoard);
      if (win) {
        win.forEach(idx => boardEl.children[idx].classList.add('demo-win'));
      }
    });
    boardEl.appendChild(cell);
  }
  dom.boardWrap.appendChild(boardEl);
}

function checkPracticeWin(board) {
  const patterns = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of patterns) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return [a,b,c];
  }
  return null;
}

// ── Public API ─────────────────────────────────────────
export function startClassic() {
  _steps = CLASSIC_STEPS;
  _currentStep = 0;
  navigate('tutorialActiveScreen');

  const dom = initDOM();
  renderStep(dom, _steps[0]);

  dom.prevBtn.onclick = () => {
    if (_currentStep > 0) { _currentStep--; renderStep(dom, _steps[_currentStep]); }
  };

  dom.nextBtn.onclick = () => {
    if (_currentStep < _steps.length - 1) {
      _currentStep++;
      renderStep(dom, _steps[_currentStep]);
    } else {
      navigate('tutorialScreen');
    }
  };

  dom.practiceBtn.onclick = () => {
    // Navigate to Classic game setup screen in practice mode
    navigate('classicSetupScreen');
  };

  dom.exitBtn.onclick = () => navigate('homeScreen');
}

export function startUltimate() {
  _steps = ULTIMATE_STEPS;
  _currentStep = 0;
  navigate('tutorialActiveScreen');

  const dom = initDOM();
  renderStep(dom, _steps[0]);

  dom.prevBtn.onclick = () => {
    if (_currentStep > 0) { _currentStep--; renderStep(dom, _steps[_currentStep]); }
  };

  dom.nextBtn.onclick = () => {
    if (_currentStep < _steps.length - 1) {
      _currentStep++;
      renderStep(dom, _steps[_currentStep]);
    } else {
      navigate('tutorialScreen');
    }
  };

  dom.practiceBtn.onclick = () => {
    // Navigate to Ultimate game setup screen in practice mode
    navigate('ultimateSetupScreen');
  };

  dom.exitBtn.onclick = () => navigate('homeScreen');
}

export function wireTutorialScreenEvents() {
  document.getElementById('tutClassicBtn').addEventListener('click', () => startClassic());
  document.getElementById('tutUltimateBtn').addEventListener('click', () => startUltimate());
}

export const Tutorial = { startClassic, startUltimate, wireTutorialScreenEvents };
