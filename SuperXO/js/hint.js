/**
 * hint.js — Best-move hints powered by the AI engine.
 */
import { AI } from './ai.js';

export class HintExhaustedError extends Error {
  constructor() {
    super('No hints remaining');
    this.name = 'HintExhaustedError';
  }
}

/**
 * Request a hint.
 * @param {Array} board — array[9] of 'X'|'O'|null
 * @param {string} player — the player who needs the hint ('X' or 'O')
 * @param {number} remaining — hints left this game
 * @returns {{ index: number, remaining: number }}
 * @throws {HintExhaustedError}
 */
function request(board, player, remaining) {
  if (remaining <= 0) throw new HintExhaustedError();
  const index = AI.getBestMove(board, 'impossible', player);
  return { index, remaining: remaining - 1 };
}

export const Hint = { request };
