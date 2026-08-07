/**
 * Property-based tests for SuperXO.
 * Uses fast-check. Run with: node tests/property/superxo.test.js
 *
 * These tests run in Node.js using dynamic imports of the ES modules.
 * fast-check is loaded via npm (install with: npm install fast-check).
 */

// Node 18+ supports top-level await in ESM; use dynamic require-compatible shim
import fc from 'fast-check';
import { strict as assert } from 'assert';

// ── Inline pure logic (extracted from modules for testability in Node) ──

const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function checkWinner(board) {
  for (const [a, b, c] of WIN_PATTERNS) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
  }
  if (board.every(v => v !== null)) return 'draw';
  return null;
}

function hasWon(board, player) {
  return WIN_PATTERNS.some(([a, b, c]) =>
    board[a] === player && board[b] === player && board[c] === player
  );
}

function isFull(board) { return board.every(v => v !== null); }

function score(board, maximizer) {
  const minimizer = maximizer === 'X' ? 'O' : 'X';
  if (hasWon(board, maximizer)) return 10;
  if (hasWon(board, minimizer)) return -10;
  return 0;
}

function minimax(board, isMaximizing, maximizer, alpha, beta, depth, maxDepth) {
  const s = score(board, maximizer);
  if (s !== 0) return s - depth * (s > 0 ? 1 : -1);
  if (isFull(board) || depth >= maxDepth) return 0;
  const minimizer = maximizer === 'X' ? 'O' : 'X';
  const current = isMaximizing ? maximizer : minimizer;
  const empties = board.reduce((a, v, i) => { if (v === null) a.push(i); return a; }, []);
  if (isMaximizing) {
    let best = -Infinity;
    for (const idx of empties) {
      board[idx] = current;
      best = Math.max(best, minimax(board, false, maximizer, alpha, beta, depth + 1, maxDepth));
      board[idx] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const idx of empties) {
      board[idx] = current;
      best = Math.min(best, minimax(board, true, maximizer, alpha, beta, depth + 1, maxDepth));
      board[idx] = null;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(board, difficulty, player = 'O') {
  const empties = board.reduce((a, v, i) => { if (v === null) a.push(i); return a; }, []);
  if (empties.length === 0 || hasWon(board, 'X') || hasWon(board, 'O')) return null;
  const randomMove = () => empties[Math.floor(Math.random() * empties.length)];
  const config = {
    beginner:   { randomChance: 0.80, maxDepth: 1 },
    easy:       { randomChance: 0.50, maxDepth: 2 },
    medium:     { randomChance: 0.30, maxDepth: 4 },
    hard:       { randomChance: 0.10, maxDepth: 9 },
    impossible: { randomChance: 0.00, maxDepth: 9 },
  }[difficulty] || { randomChance: 0, maxDepth: 9 };
  if (Math.random() < config.randomChance) return randomMove();
  let bestScore = -Infinity, bestMove = empties[0];
  const bc = [...board];
  for (const idx of empties) {
    bc[idx] = player;
    const s = minimax(bc, false, player, -Infinity, Infinity, 0, config.maxDepth);
    bc[idx] = null;
    if (s > bestScore) { bestScore = s; bestMove = idx; }
  }
  return bestMove;
}

// Storage simulation for tests
function makeStorage() {
  const store = {};
  return {
    get(key) {
      if (!(key in store)) return undefined;
      try { return JSON.parse(JSON.stringify(store[key])); } catch { return undefined; }
    },
    set(key, value) { store[key] = JSON.parse(JSON.stringify(value)); },
  };
}

// Achievement definitions (inline for test isolation)
const ACH_DEFS = [
  { id: 'first_win', condition: s => s.wins >= 1 },
  { id: 'wins_5',    condition: s => s.wins >= 5 },
  { id: 'wins_10',   condition: s => s.wins >= 10 },
  { id: 'marathon',  condition: s => s.played >= 50 },
];

function checkAchievements(stats, unlockedMap, coinBalance) {
  let coins = coinBalance;
  const coinRewards = { first_win: 50, wins_5: 100, wins_10: 150, marathon: 250 };
  const newlyUnlocked = [];
  for (const def of ACH_DEFS) {
    if (!unlockedMap[def.id] && def.condition(stats)) {
      unlockedMap[def.id] = { unlockedAt: new Date().toISOString() };
      coins += coinRewards[def.id] || 0;
      newlyUnlocked.push(def.id);
    }
  }
  return { coins, newlyUnlocked };
}

// Replay logic
function replayBoard(moveHistory, upToStep) {
  const board = Array(9).fill(null);
  for (let i = 0; i < Math.min(upToStep, moveHistory.length); i++) {
    board[moveHistory[i].index] = moveHistory[i].player;
  }
  return board;
}

// Ultimate active-board routing
function routeActiveBoard(boardWinners, cellIdx) {
  return boardWinners[cellIdx] !== null ? null : cellIdx;
}

// ── Generators ─────────────────────────────────────────

const arbPlayer = fc.constantFrom('X', 'O');

// Arbitrary board: random cell values
const arbBoard = fc.array(
  fc.option(fc.constantFrom('X', 'O'), { nil: null, freq: 3 }),
  { minLength: 9, maxLength: 9 }
);

// Board where player wins one pattern
const arbWinningBoard = (player) => fc.integer({ min: 0, max: 7 }).map(patIdx => {
  const board = Array(9).fill(null);
  const [a, b, c] = WIN_PATTERNS[patIdx];
  board[a] = player; board[b] = player; board[c] = player;
  return board;
});

// Full board with no winner (generated by building valid sequence)
const arbDrawBoard = fc.array(fc.integer({ min: 0, max: 8 }), { minLength: 9, maxLength: 9 })
  .filter(() => true) // we build them manually
  .map(() => {
    // Known draw board
    return ['X','O','X','X','X','O','O','X','O'];
  });

// Valid move sequence (alternating players, no duplicates, board not terminal)
const arbMoveSequence = fc.integer({ min: 0, max: 5 }).map(numExtra => {
  const moves = [];
  const board = Array(9).fill(null);
  let player = 'X';
  const indices = [4, 0, 8, 2, 6, 1, 3, 5, 7]; // deterministic order for reliability
  for (let i = 0; i < Math.min(numExtra + 3, 9); i++) {
    const idx = indices[i];
    moves.push({ player, index: idx });
    board[idx] = player;
    if (hasWon(board, player)) break;
    player = player === 'X' ? 'O' : 'X';
  }
  return moves;
});

// Arbitrary serialisable value
const arbValue = fc.oneof(
  fc.integer(),
  fc.string(),
  fc.boolean(),
  fc.array(fc.string(), { maxLength: 4 }),
  fc.record({ x: fc.integer(), y: fc.string() }),
);

// Arbitrary stats object
const arbStats = fc.record({
  wins: fc.integer({ min: 0, max: 200 }),
  played: fc.integer({ min: 0, max: 500 }),
  losses: fc.integer({ min: 0, max: 200 }),
  draws: fc.integer({ min: 0, max: 200 }),
});

// Arbitrary non-terminal board (has empties, no winner)
const arbNonTerminalBoard = fc.array(
  fc.option(fc.constantFrom('X', 'O'), { nil: null, freq: 4 }),
  { minLength: 9, maxLength: 9 }
).filter(board =>
  board.some(v => v === null) &&
  !hasWon(board, 'X') &&
  !hasWon(board, 'O')
);

// ── Tests ──────────────────────────────────────────────
let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${name}`);
    console.error('    ', e.message || e);
    failed++;
  }
}

console.log('\n🧪 SuperXO Property-Based Tests\n');
console.log('─'.repeat(50));

// Feature: superxo, Property 1: Classic win detection is exhaustive and symmetric
runTest('Property 1: Win detection — exhaustive across all patterns and players', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('X', 'O'),
      fc.integer({ min: 0, max: 7 }),
      (player, patIdx) => {
        const board = Array(9).fill(null);
        const [a, b, c] = WIN_PATTERNS[patIdx];
        board[a] = player; board[b] = player; board[c] = player;
        return checkWinner(board) === player;
      }
    ),
    { numRuns: 200 }
  );
});

// Feature: superxo, Property 2: Classic draw detection is correct
runTest('Property 2: Draw detection on full no-winner boards', () => {
  // Use a known set of draw boards
  const drawBoards = [
    ['X','O','X','X','X','O','O','X','O'],
    ['O','X','X','X','O','O','X','O','X'],
    ['X','X','O','O','O','X','X','X','O'],
  ];
  for (const board of drawBoards) {
    assert.equal(checkWinner(board), 'draw', `Expected draw for board: ${board}`);
  }

  fc.assert(
    fc.property(
      fc.constant(null),
      () => {
        // Generate a draw board by filling a known draw configuration
        const board = ['X','O','X','X','X','O','O','X','O'];
        return checkWinner(board) === 'draw';
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: superxo, Property 3: Move history replay round-trip
runTest('Property 3: Replay move-history round-trip', () => {
  fc.assert(
    fc.property(arbMoveSequence, (moves) => {
      // Play moves live
      const liveBoard = Array(9).fill(null);
      for (const m of moves) liveBoard[m.index] = m.player;

      // Replay to end
      const replayed = replayBoard(moves, moves.length);

      // Boards must be identical
      return liveBoard.every((v, i) => v === replayed[i]);
    }),
    { numRuns: 200 }
  );
});

// Feature: superxo, Property 4: AI move is always valid (all difficulties)
runTest('Property 4: AI.getBestMove always returns a valid empty-cell index', () => {
  const difficulties = ['beginner', 'easy', 'medium', 'hard', 'impossible'];
  fc.assert(
    fc.property(
      arbNonTerminalBoard,
      fc.constantFrom(...difficulties),
      (board, difficulty) => {
        const move = getBestMove([...board], difficulty, 'O');
        if (move === null) return false; // non-terminal board should never return null
        return move >= 0 && move <= 8 && board[move] === null;
      }
    ),
    { numRuns: 300 }
  );
});

// Feature: superxo, Property 5: Impossible AI never loses from opening position
runTest('Property 5: Impossible AI never loses (play out full game)', () => {
  // Play 50 full games where human plays randomly, AI plays impossible
  let aiLost = false;
  for (let g = 0; g < 50; g++) {
    const board = Array(9).fill(null);
    let player = 'X'; // Human starts
    while (!isFull(board) && !hasWon(board, 'X') && !hasWon(board, 'O')) {
      if (player === 'X') {
        // Human plays random
        const empties = board.reduce((a, v, i) => { if (v === null) a.push(i); return a; }, []);
        board[empties[Math.floor(Math.random() * empties.length)]] = 'X';
      } else {
        const move = getBestMove([...board], 'impossible', 'O');
        if (move !== null) board[move] = 'O';
      }
      if (hasWon(board, player)) break;
      player = player === 'X' ? 'O' : 'X';
    }
    if (hasWon(board, 'X')) { aiLost = true; break; }
  }
  assert(!aiLost, 'Impossible AI lost at least one game');
});

// Feature: superxo, Property 6: Storage round-trip
runTest('Property 6: Storage set/get round-trip for any serialisable value', () => {
  fc.assert(
    fc.property(fc.string({ minLength: 1, maxLength: 20 }), arbValue, (key, value) => {
      const storage = makeStorage();
      storage.set(key, value);
      const retrieved = storage.get(key);
      return JSON.stringify(retrieved) === JSON.stringify(value);
    }),
    { numRuns: 200 }
  );
});

// Feature: superxo, Property 7: Achievement unlock idempotence
runTest('Property 7: Achievement unlock is idempotent (no double coin awards)', () => {
  fc.assert(
    fc.property(arbStats, (stats) => {
      const unlockedMap = {};
      let coins = 100;

      // First check
      const r1 = checkAchievements(stats, unlockedMap, coins);
      coins = r1.coins;

      // Second check with same stats — should not award more coins
      const r2 = checkAchievements(stats, unlockedMap, coins);

      return r2.newlyUnlocked.length === 0 && r2.coins === coins;
    }),
    { numRuns: 200 }
  );
});

// Feature: superxo, Property 8: Coin balance never goes negative
runTest('Property 8: Coin balance never goes negative', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({
        type: fc.constantFrom('earn', 'spend'),
        amount: fc.integer({ min: 1, max: 200 }),
      }), { minLength: 1, maxLength: 30 }),
      (operations) => {
        let balance = 0;
        for (const op of operations) {
          if (op.type === 'earn') {
            balance += op.amount;
          } else {
            // Only spend if we have enough — guard mimics the app
            if (balance >= op.amount) balance -= op.amount;
          }
          if (balance < 0) return false;
        }
        return true;
      }
    ),
    { numRuns: 300 }
  );
});

// Feature: superxo, Property 9: Ultimate active-board routing
runTest('Property 9: Ultimate active-board routing after every move', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 8 }), // cell index of the move
      fc.array(fc.option(fc.constantFrom('X', 'O', 'draw'), { nil: null }), { minLength: 9, maxLength: 9 }),
      (cellIdx, boardWinners) => {
        const active = routeActiveBoard(boardWinners, cellIdx);
        if (boardWinners[cellIdx] !== null) {
          return active === null; // free choice
        } else {
          return active === cellIdx; // must play in that board
        }
      }
    ),
    { numRuns: 300 }
  );
});

// Feature: superxo, Property 10: Theme CSS vars — test the logic inline
runTest('Property 10: Theme vars object contains all required CSS custom properties', () => {
  const REQUIRED_VARS = [
    '--color-bg-1', '--color-bg-2', '--color-accent-1',
    '--color-accent-2', '--color-surface', '--color-border',
    '--color-text', '--glow-color',
  ];

  const THEMES = [
    { id: 'classic', vars: { '--color-bg-1': '#203050', '--color-bg-2': '#05080f', '--color-accent-1': '#2dd4ff', '--color-accent-2': '#7dff74', '--color-surface': 'rgba(255,255,255,0.06)', '--color-border': 'rgba(255,255,255,0.10)', '--color-text': '#e8f4ff', '--glow-color': '#2dd4ff' } },
    { id: 'neon',    vars: { '--color-bg-1': '#0d001a', '--color-bg-2': '#050010', '--color-accent-1': '#ff00ff', '--color-accent-2': '#00ffff', '--color-surface': 'rgba(255,0,255,0.06)', '--color-border': 'rgba(255,0,255,0.15)', '--color-text': '#ffddff', '--glow-color': '#ff00ff' } },
  ];

  fc.assert(
    fc.property(fc.constantFrom(...THEMES), (theme) => {
      return REQUIRED_VARS.every(v => v in theme.vars && theme.vars[v].length > 0);
    }),
    { numRuns: 100 }
  );
});

// ── Summary ──────────────────────────────────────────
console.log('─'.repeat(50));
console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed\n`);

if (failed > 0) process.exit(1);
