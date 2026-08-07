/**
 * timer.js — per-turn countdown timer.
 * Owns no DOM; callers supply onTick and onExpire callbacks.
 */

let _intervalId = null;
let _remaining = 0;
let _onTick = null;
let _onExpire = null;

/**
 * Start the timer.
 * @param {number} duration — seconds
 * @param {(remaining: number) => void} onTick
 * @param {() => void} onExpire
 */
function start(duration, onTick, onExpire) {
  stop();
  _remaining = duration;
  _onTick = onTick;
  _onExpire = onExpire;

  onTick(_remaining);

  _intervalId = setInterval(() => {
    _remaining--;
    if (_onTick) _onTick(_remaining);
    if (_remaining <= 0) {
      stop();
      if (_onExpire) _onExpire();
    }
  }, 1000);
}

/** Stop and clear the timer. */
function stop() {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

/**
 * Reset the timer to a new duration without starting it.
 * @param {number} duration
 */
function reset(duration) {
  stop();
  _remaining = duration;
}

/** @returns {number} seconds remaining */
function getRemaining() {
  return _remaining;
}

/** @returns {boolean} */
function isRunning() {
  return _intervalId !== null;
}

export const Timer = { start, stop, reset, getRemaining, isRunning };
