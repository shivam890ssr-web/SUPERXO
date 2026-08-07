/**
 * tutorial.js — Interactive guided tutorials for Classic and Ultimate.
 */
import { navigate } from './main.js';

const CLASSIC_STEPS = [
  {
    instruction: "Welcome to Classic Tic-Tac-Toe! You play on a 3×3 grid. Two players take turns placing X and O.",
    waitForAction: false,
  },
  {
    instruction: "Click on any empty cell to place your symbol. Try clicking a cell now!",
    highlightSelector: '.tut-board-wrap',
    waitForAction: true,
    actionValidator: (e) => !!e.target.closest('.tut-cell'),
  },
  {
    instruction: "The first player to place three symbols in a row — horizontally, vertically, or diagonally — wins!",
    waitForAction: false,
  },
  {
    instruction: "If all 9 cells are filled with no winner, the game is a draw.",
    waitForAction: false,
  },
  {
    instruction: "That's Classic Tic-Tac-Toe! You can now enter Practice Mode to play freely, or exit to try a real game.",
    waitForAction: false,
  },
];

const ULTIMATE_STEPS = [
  {
    instruction: "Welcome to Ultimate Tic-Tac-Toe! The board is made of 9 smaller Tic-Tac-Toe boards arranged in a 3×3 grid.",
    waitForAction: false,
  },
  {
    instruction: "Your goal is to win 3 local boards in a row on the outer (global) board.",
    waitForAction: false,
  },
  {
    instruction: "The twist: wherever you play inside a local board, your opponent must play in the corresponding local board next turn.",
    waitForAction: false,
  },
  {
    instruction: "If the required local board is already won or full, your opponent can play anywhere.",
    waitForAction: false,
  },
  {
    instruction: "The highlighted board is where you MUST play. Try clicking a cell in the highlighted board!",
    waitForAction: true,
    actionValidator: (e) => !!e.target.closest('.tut-cell'),
  },
  {
    instruction: "Excellent! Master the routing and you'll master Ultimate. Enter Practice Mode or exit to play!",
    waitForAction: false,
  },
];

let _mode = 'classic';
let _steps = [];
let _currentStep = 0;
let _practiceMode = false;
let _practiceBoard = [];
let _practicePlayer = 'X';
let _awaitingAction = false;

function initDOM() {
  return {
    indicator: document.getElementById('tutStepIndicator'),
    instruction: document.getElementById('tutInstruction'),
    boardWrap: document.getElementById('tutBoardWrap'),
    prevBtn: document.getElementById('tutPrevBtn'),
    nextBtn: document.getElementById('tutNextBtn'),
    practiceBtn: document.getElementById('tutPracticeBtn'),
    exitBtn: document.getElementById('tutExitBtn'),
    highlight: document.getElementById('tutHighlight'),
  };
}

function buildTutBoard(dom) {
  dom.boardWrap.innerHTML = '';
  const board = document.createElement('div');
  board.className = 'tut-board';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'tut-cell';
    cell.dataset.idx = i;
    board.appendChild(cell);
  }
  dom.boardWrap.appendChild(board);
  _practiceBoard = Array(9).fill(null);
  _practicePlayer = 'X';
  return board;
}

function renderStep(dom) {
  const step = _steps[_currentStep];
  if (!step) return;

  dom.indicator.textContent = `Step ${_currentStep + 1} / ${_steps.length}`;
  dom.instruction.textContent = step.instruction;
  dom.prevBtn.disabled = _currentStep === 0;
  dom.nextBtn.disabled = step.waitForAction && !_practiceMode;
  _awaitingAction = step.waitForAction || false;
}

export function startClassic() {
  _mode = 'classic';
  _steps = CLASSIC_STEPS;
  _currentStep = 0;
  _practiceMode = false;
  navigate('tutorialActiveScreen');
  const dom = initDOM();
  buildTutBoard(dom);
  renderStep(dom);
  wireTutorialBoard(dom);
}

export function startUltimate() {
  _mode = 'ultimate';
  _steps = ULTIMATE_STEPS;
  _currentStep = 0;
  _practiceMode = false;
  navigate('tutorialActiveScreen');
  const dom = initDOM();
  buildTutBoard(dom);
  renderStep(dom);
  wireTutorialBoard(dom);
}

function wireTutorialBoard(dom) {
  dom.boardWrap.onclick = (e) => {
    const cell = e.target.closest('.tut-cell');
    if (!cell) return;

    if (_practiceMode) {
      const idx = Number(cell.dataset.idx);
      if (_practiceBoard[idx]) return;
      _practiceBoard[idx] = _practicePlayer;
      cell.textContent = _practicePlayer;
      cell.classList.add('player-' + _practicePlayer.toLowerCase());
      _practicePlayer = _practicePlayer === 'X' ? 'O' : 'X';
      return;
    }

    if (_awaitingAction) {
      const step = _steps[_currentStep];
      if (step.actionValidator && step.actionValidator(e)) {
        _awaitingAction = false;
        dom.nextBtn.disabled = false;
        dom.instruction.textContent = '✅ ' + step.instruction;
      }
    }
  };

  dom.prevBtn.onclick = () => {
    if (_currentStep > 0) { _currentStep--; renderStep(dom); }
  };

  dom.nextBtn.onclick = () => {
    if (_currentStep < _steps.length - 1) {
      _currentStep++;
      renderStep(dom);
    } else {
      exit();
    }
  };

  dom.practiceBtn.onclick = () => {
    _practiceMode = true;
    dom.instruction.textContent = '🎯 Practice mode — play freely, no stats recorded!';
    dom.nextBtn.disabled = false;
    dom.prevBtn.disabled = true;
    buildTutBoard(dom);
  };

  dom.exitBtn.onclick = () => exit();
}

function exit() {
  navigate('tutorialScreen');
}

export function wireTutorialScreenEvents() {
  document.getElementById('tutClassicBtn').addEventListener('click', () => startClassic());
  document.getElementById('tutUltimateBtn').addEventListener('click', () => startUltimate());
}

export const Tutorial = { startClassic, startUltimate, wireTutorialScreenEvents };
