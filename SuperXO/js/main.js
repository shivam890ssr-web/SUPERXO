/**
 * main.js — SPA router, bootstrap, and global utilities.
 * Imported by all other modules for navigation and dialog helpers.
 */
import { Storage } from './storage.js';
import { Theme } from './theme.js';
import { Settings } from './settings.js';
import { Sound } from './sound.js';
import { Classic, wireClassicEvents, checkWinner } from './classic.js';
import { Ultimate, wireUltimateEvents } from './ultimate.js';
import { Statistics } from './statistics.js';
import { Achievements } from './achievements.js';
import { Replay } from './replay.js';
import { Tutorial, wireTutorialScreenEvents } from './tutorial.js';

const APP_VERSION = '1.0.0';

// ── Screen history stack ───────────────────────────────
let _screenStack = [];
let _currentScreen = null;

const ALL_SCREENS = [
  'splashScreen', 'homeScreen', 'gameSelectScreen',
  'classicSetupScreen', 'classicGameScreen',
  'ultimateSetupScreen', 'ultimateGameScreen',
  'replayScreen', 'statisticsScreen', 'achievementsScreen',
  'settingsScreen', 'tutorialScreen', 'tutorialActiveScreen', 'aboutScreen',
];

/**
 * Navigate to a screen.
 * @param {string} screenId
 * @param {'forward'|'back'} [direction='forward']
 */
export function navigate(screenId, direction = 'forward') {
  const prev = _currentScreen;
  if (prev && prev !== screenId) {
    const prevEl = document.getElementById(prev);
    if (prevEl) {
      prevEl.classList.add('screen-exit');
      setTimeout(() => {
        prevEl.style.display = 'none';
        prevEl.classList.remove('screen-exit');
      }, 280);
    }
  }

  const next = document.getElementById(screenId);
  if (!next) { console.warn('[Router] Screen not found:', screenId); return; }

  next.style.display = '';
  next.classList.add('screen-enter');
  setTimeout(() => next.classList.remove('screen-enter'), 300);

  if (direction === 'forward' && prev && prev !== screenId) {
    _screenStack.push(prev);
  }
  _currentScreen = screenId;

  onScreenEnter(screenId);
  Sound.play('click');
}

/** Navigate back one level. */
export function navigateBack() {
  const prev = _screenStack.pop();
  if (prev) navigate(prev, 'back');
}

/** Called whenever a screen becomes active — trigger any refresh logic. */
function onScreenEnter(screenId) {
  switch (screenId) {
    case 'homeScreen':
      refreshHomeCoins();
      // Auto-unlock any themes earned so far
      Theme.checkUnlocks(Statistics.get().played);
      break;
    case 'statisticsScreen':
      renderStatisticsScreen();
      break;
    case 'achievementsScreen':
      renderAchievementsScreen();
      break;
    case 'settingsScreen':
      renderSettingsScreen();
      break;
    case 'replayScreen':
      renderReplayScreen();
      break;
  }
}

// ── Init ───────────────────────────────────────────────
function initApp() {
  // Apply theme and settings first
  Theme.apply(Theme.getCurrent());
  Settings.applyAll();
  applyBoardCustom();

  // Set version strings
  document.querySelectorAll('.splash-version, #settingsVersion, #aboutVersion').forEach(el => {
    el.textContent = el.id === 'settingsVersion' ? `Version ${APP_VERSION}` : APP_VERSION;
  });
  const aboutVer = document.getElementById('aboutVersion');
  if (aboutVer) aboutVer.textContent = `Version ${APP_VERSION}`;
  const settingsVer = document.getElementById('settingsVersion');
  if (settingsVer) settingsVer.textContent = `Version ${APP_VERSION}`;
  const splashVer = document.getElementById('splashVersion');
  if (splashVer) splashVer.textContent = `v${APP_VERSION}`;

  // Splash logic
  const splashSeen = Storage.get('splashSeen');
  if (splashSeen) {
    skipSplash();
  } else {
    showSplash();
  }

  // Wire all events
  wireNavEvents();
  wireHomeEvents();
  wireSetupEvents();
  wireClassicEvents();
  wireUltimateEvents();
  wireSettingsEvents();
  wireReplayEvents();
  wireTutorialScreenEvents();
  wireBackButtons();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {/* offline support best-effort */});
  }
}

// ── Splash ────────────────────────────────────────────
function showSplash() {
  _currentScreen = 'splashScreen';
  const progress = document.getElementById('splashProgress');
  const loadingText = document.getElementById('splashLoadingText');
  const continueText = document.getElementById('splashContinueText');

  let value = 0;
  // ~5 seconds (100 steps × 50ms)
  const interval = setInterval(() => {
    value = Math.min(value + 2, 100);
    progress.style.width = value + '%';
    if (value >= 100) {
      clearInterval(interval);
      loadingText.style.display = 'none';
      continueText.style.display = 'block';
    }
  }, 100);

  const proceed = () => {
    if (value >= 100) {
      document.removeEventListener('click', proceed);
      Storage.set('splashSeen', true);
      navigate('homeScreen');
    }
  };
  document.addEventListener('click', proceed);
}

function skipSplash() {
  const splash = document.getElementById('splashScreen');
  if (splash) splash.style.display = 'none';
  navigate('homeScreen');
}

// ── Home coin display ─────────────────────────────────
function refreshHomeCoins() {
  const coins = Storage.get('coins');
  const el = document.getElementById('homeCoinBalance');
  if (el) el.textContent = coins;
}

// ── Nav events ────────────────────────────────────────
function wireNavEvents() {
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  });
}

function wireBackButtons() {
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => navigateBack());
  });
}

function wireHomeEvents() {
  document.getElementById('homePlayBtn').addEventListener('click', () => navigate('gameSelectScreen'));
}

// ── Setup screen events ───────────────────────────────
function wireSetupEvents() {
  // Classic setup
  document.getElementById('selectClassicBtn').addEventListener('click', () => navigate('classicSetupScreen'));
  document.getElementById('selectUltimateBtn').addEventListener('click', () => navigate('ultimateSetupScreen'));

  // Mode toggles — Classic
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const isAI = btn.dataset.mode === 'hvai';
      document.getElementById('p2NameRow').style.display = isAI ? 'none' : '';
      document.getElementById('difficultyRow').style.display = isAI ? '' : 'none';
      Sound.play('click');
    });
  });

  // Timer toggle — Classic
  document.querySelectorAll('[data-timer]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-timer]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('timerDurationRow').style.display =
        btn.dataset.timer === 'on' ? '' : 'none';
      Sound.play('click');
    });
  });

  // Start Classic game
  document.getElementById('startClassicBtn').addEventListener('click', () => {
    const mode = document.querySelector('[data-mode].active')?.dataset.mode || 'hvh';
    const timerOn = document.querySelector('[data-timer].active')?.dataset.timer === 'on';
    const config = {
      p1: document.getElementById('p1Name').value.trim() || 'Player 1',
      p2: mode === 'hvh' ? (document.getElementById('p2Name').value.trim() || 'Player 2') : 'AI',
      mode,
      difficulty: document.getElementById('aiDifficulty').value,
      rounds: Number(document.getElementById('roundsSelect').value),
      timerEnabled: timerOn,
      timerDuration: Number(document.getElementById('timerDuration').value),
    };
    Classic.init(config);
    navigate('classicGameScreen');
  });

  // Mode toggles — Ultimate
  document.querySelectorAll('[data-umode]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-umode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const isAI = btn.dataset.umode === 'hvai';
      document.getElementById('up2NameRow').style.display = isAI ? 'none' : '';
      document.getElementById('uDifficultyRow').style.display = isAI ? '' : 'none';
      Sound.play('click');
    });
  });

  // Start Ultimate game
  document.getElementById('startUltimateBtn').addEventListener('click', () => {
    const mode = document.querySelector('[data-umode].active')?.dataset.umode || 'hvh';
    const timerOn = document.querySelector('[data-utimer].active')?.dataset.utimer === 'on';
    const config = {
      p1: document.getElementById('up1Name').value.trim() || 'Player 1',
      p2: mode === 'hvh' ? (document.getElementById('up2Name').value.trim() || 'Player 2') : 'AI',
      mode,
      difficulty: document.getElementById('uAiDifficulty').value,
      timerEnabled: timerOn,
      timerDuration: Number(document.getElementById('uTimerDuration')?.value || 30),
    };
    Ultimate.init(config);
    navigate('ultimateGameScreen');
  });

  // Timer toggle — Ultimate
  document.querySelectorAll('[data-utimer]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-utimer]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const uTimerRow = document.getElementById('uTimerDurationRow');
      if (uTimerRow) uTimerRow.style.display = btn.dataset.utimer === 'on' ? '' : 'none';
      Sound.play('click');
    });
  });
}

// ── Settings events ───────────────────────────────────
function wireSettingsEvents() {
  // Toggle switches
  const toggles = [
    { id: 'toggleDarkMode', key: 'darkMode' },
    { id: 'toggleAnimations', key: 'animations' },
    { id: 'toggleSound', key: 'sound' },
    { id: 'toggleMusic', key: 'music' },
    { id: 'toggleTimerDefault', key: 'timerDefault' },
  ];

  toggles.forEach(({ id, key }) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    // Set initial state
    const val = Settings.get(key);
    btn.setAttribute('aria-checked', String(val !== false));
    btn.classList.toggle('on', val !== false);

    btn.addEventListener('click', () => {
      const current = Settings.get(key);
      const next = !current;
      Settings.set(key, next);
      btn.setAttribute('aria-checked', String(next));
      btn.classList.toggle('on', next);
      Settings.applyAll();
      Sound.play('click');
    });
  });

  // Corner radius
  const radiusInput = document.getElementById('cornerRadius');
  if (radiusInput) {
    const bc = Storage.get('boardCustom');
    radiusInput.value = bc.cornerRadius ?? 16;
    radiusInput.addEventListener('input', () => {
      const bc = Storage.get('boardCustom');
      bc.cornerRadius = Number(radiusInput.value);
      Storage.set('boardCustom', bc);
      applyBoardCustom();
    });
  }

  // Glow intensity
  const glowSelect = document.getElementById('glowIntensity');
  if (glowSelect) {
    const bc = Storage.get('boardCustom');
    glowSelect.value = bc.glowIntensity || 'medium';
    glowSelect.addEventListener('change', () => {
      const bc = Storage.get('boardCustom');
      bc.glowIntensity = glowSelect.value;
      Storage.set('boardCustom', bc);
      applyBoardCustom();
    });
  }

  // Grid line toggles (wired dynamically in renderSettingsScreen)

  // Classic grid toggle
  document.getElementById('classicGridToggle')?.addEventListener('click', function() {
    const bc = Storage.get('boardCustom');
    bc.classicGridLines = !bc.classicGridLines;
    Storage.set('boardCustom', bc);
    this.classList.toggle('on', bc.classicGridLines);
    this.setAttribute('aria-checked', String(bc.classicGridLines));
    applyBoardCustom();
  });

  // Outer grid toggle
  document.getElementById('outerGridToggle')?.addEventListener('click', function() {
    const bc = Storage.get('boardCustom');
    bc.outerGridLines = !bc.outerGridLines;
    Storage.set('boardCustom', bc);
    this.classList.toggle('on', bc.outerGridLines);
    this.setAttribute('aria-checked', String(bc.outerGridLines));
    applyBoardCustom();
  });

  // Inner grid toggle
  document.getElementById('innerGridToggle')?.addEventListener('click', function() {
    const bc = Storage.get('boardCustom');
    bc.innerGridLines = !bc.innerGridLines;
    Storage.set('boardCustom', bc);
    this.classList.toggle('on', bc.innerGridLines);
    this.setAttribute('aria-checked', String(bc.innerGridLines));
    applyBoardCustom();
  });

  // Classic grid width
  document.getElementById('classicGridWidth')?.addEventListener('change', function() {
    const bc = Storage.get('boardCustom');
    bc.classicGridWidth = Number(this.value);
    Storage.set('boardCustom', bc);
    applyBoardCustom();
  });

  // Classic grid opacity
  document.getElementById('classicGridOpacity')?.addEventListener('change', function() {
    const bc = Storage.get('boardCustom');
    bc.classicGridOpacity = Number(this.value);
    Storage.set('boardCustom', bc);
    applyBoardCustom();
  });

  // Outer grid width
  document.getElementById('outerGridWidth')?.addEventListener('change', function() {
    const bc = Storage.get('boardCustom');
    bc.outerGridWidth = Number(this.value);
    Storage.set('boardCustom', bc);
    applyBoardCustom();
  });

  // Inner grid width
  document.getElementById('innerGridWidth')?.addEventListener('change', function() {
    const bc = Storage.get('boardCustom');
    bc.innerGridWidth = Number(this.value);
    Storage.set('boardCustom', bc);
    applyBoardCustom();
  });

  // Reset progress
  document.getElementById('resetProgressBtn')?.addEventListener('click', () => {
    showDialog('Reset Progress', 'This will erase ALL statistics, achievements, coins, and settings. This cannot be undone.', [
      {
        label: 'Reset Everything', action: () => {
          Storage.clear();
          Theme.apply('classic');
          Settings.applyAll();
          refreshHomeCoins();
          renderSettingsScreen();
          showToast('Reset complete', 'All progress has been cleared.');
        }
      },
      { label: 'Cancel', action: null },
    ]);
  });

  // Reset stats only
  document.getElementById('resetStatsBtn')?.addEventListener('click', () => {
    showDialog('Reset Statistics', 'Are you sure you want to clear all statistics?', [
      {
        label: 'Reset', action: () => {
          Statistics.reset();
          renderStatisticsScreen();
          showToast('Statistics cleared', '');
        }
      },
      { label: 'Cancel', action: null },
    ]);
  });
}

function renderSettingsScreen() {
  // Auto-unlock themes based on games played
  const stats = Statistics.get();
  Theme.checkUnlocks(stats.played);

  // Theme grid
  const grid = document.getElementById('themeGrid');
  if (grid) {
    grid.innerHTML = '';
    const stats = Statistics.get();
    Theme.getAll().forEach(theme => {
      const unlocked = theme.unlockGames <= stats.played || Theme.isUnlocked(theme.id);
      const btn = document.createElement('button');
      btn.className = 'theme-btn' + (Theme.getCurrent() === theme.id ? ' active' : '') + (unlocked ? '' : ' locked');
      btn.innerHTML = `<span class="theme-preview" style="background:${theme.vars['--color-accent-1']}"></span>${theme.name}${unlocked ? '' : ' 🔒'}`;
      btn.setAttribute('aria-label', `${theme.name} theme${unlocked ? '' : ', locked'}`);
      btn.disabled = !unlocked;
      btn.addEventListener('click', () => {
        if (!unlocked) { showToast('Locked', `Play ${theme.unlockGames} games to unlock.`); return; }
        Theme.apply(theme.id);
        renderSettingsScreen();
        Sound.play('click');
      });
      grid.appendChild(btn);
    });
  }

  // Color packs
  const packsEl = document.getElementById('colorPacks');
  if (packsEl) {
    const COLOR_PACKS = [
      { id: 'pack_fire', name: 'Fire', x: '#ff4400', o: '#ffaa00', cost: 50 },
      { id: 'pack_ocean', name: 'Ocean', x: '#0088ff', o: '#00ffee', cost: 75 },
      { id: 'pack_rose', name: 'Rose', x: '#ff0088', o: '#ffaacc', cost: 75 },
      { id: 'pack_forest', name: 'Forest', x: '#00aa44', o: '#aaff44', cost: 100 },
      { id: 'pack_cosmic', name: 'Cosmic', x: '#aa00ff', o: '#ff00aa', cost: 150 },
    ];
    packsEl.innerHTML = '';
    const unlocked = Storage.get('unlockedColorPacks');
    const coins = Storage.get('coins');
    const current = Storage.get('pieceColors');

    COLOR_PACKS.forEach(pack => {
      const isOwned = unlocked.includes(pack.id);
      const div = document.createElement('div');
      div.className = 'color-pack-item' + (isOwned ? '' : ' locked');
      div.innerHTML = `
        <span class="cp-preview">
          <span style="color:${pack.x}">X</span>/<span style="color:${pack.o}">O</span>
        </span>
        <span class="cp-name">${pack.name}</span>
        <button class="cp-btn" aria-label="${isOwned ? 'Apply' : 'Buy'} ${pack.name} color pack">
          ${isOwned ? 'Apply' : `Buy (${pack.cost}🪙)`}
        </button>
      `;
      const btn = div.querySelector('.cp-btn');
      btn.addEventListener('click', () => {
        if (!isOwned) {
          if (coins < pack.cost) {
            showDialog('Not enough coins', `You need ${pack.cost} 🪙 but only have ${coins}.`, [{ label: 'OK', action: null }]);
            return;
          }
          Storage.set('coins', coins - pack.cost);
          const arr = Storage.get('unlockedColorPacks');
          arr.push(pack.id);
          Storage.set('unlockedColorPacks', arr);
          Sound.play('unlock');
          showToast('Pack unlocked!', `${pack.name} colors are now available.`);
        }
        Storage.set('pieceColors', { x: pack.x, o: pack.o });
        renderSettingsScreen();
        refreshHomeCoins();
      });
      packsEl.appendChild(div);
    });
  }

  // Refresh toggles
  ['darkMode','animations','sound','music','timerDefault'].forEach((key, i) => {
    const ids = ['toggleDarkMode','toggleAnimations','toggleSound','toggleMusic','toggleTimerDefault'];
    const btn = document.getElementById(ids[i]);
    if (!btn) return;
    const val = Settings.get(key);
    btn.setAttribute('aria-checked', String(val !== false));
    btn.classList.toggle('on', val !== false);
  });

  applyBoardCustom();

  // Sync grid-line toggle states
  const bc2 = Storage.get('boardCustom');
  const syncToggle = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('on', val !== false);
    el.setAttribute('aria-checked', String(val !== false));
  };
  syncToggle('classicGridToggle', bc2.classicGridLines !== false);
  syncToggle('outerGridToggle', bc2.outerGridLines !== false);
  syncToggle('innerGridToggle', bc2.innerGridLines !== false);
  // Sync selects
  const syncSel = (id, val) => { const el = document.getElementById(id); if (el) el.value = String(val); };
  syncSel('classicGridWidth', bc2.classicGridWidth ?? 2);
  syncSel('classicGridOpacity', bc2.classicGridOpacity ?? 0.18);
  syncSel('outerGridWidth', bc2.outerGridWidth ?? 3);
  syncSel('innerGridWidth', bc2.innerGridWidth ?? 1);

  // Coin balance
  const coins = Storage.get('coins');
  const achBal = document.getElementById('achCoinBalance');
  if (achBal) achBal.textContent = coins;
}

function applyBoardCustom() {
  const bc = Storage.get('boardCustom');
  const r = document.documentElement;

  r.style.setProperty('--cell-radius', (bc.cornerRadius ?? 16) + 'px');

  const glowMap = { none:'0px', low:'4px', medium:'10px', high:'22px' };
  r.style.setProperty('--cell-glow', glowMap[bc.glowIntensity] || '10px');

  // Classic grid lines
  r.style.setProperty('--grid-lines-visible', bc.classicGridLines !== false ? '1' : '0');
  r.style.setProperty('--grid-line-width', (bc.classicGridWidth ?? 2) + 'px');
  r.style.setProperty('--grid-line-opacity', String(bc.classicGridOpacity ?? 0.22));

  // Ultimate outer grid
  r.style.setProperty('--outer-grid-visible', bc.outerGridLines !== false ? '1' : '0');
  r.style.setProperty('--outer-grid-width', (bc.outerGridWidth ?? 4) + 'px');
  r.style.setProperty('--outer-grid-opacity', String(bc.outerGridOpacity ?? 0.35));

  // Ultimate inner grid
  r.style.setProperty('--inner-grid-visible', bc.innerGridLines !== false ? '1' : '0');
  r.style.setProperty('--inner-grid-width', (bc.innerGridWidth ?? 1) + 'px');
  r.style.setProperty('--inner-grid-opacity', String(bc.innerGridOpacity ?? 0.15));
}

// ── Statistics screen ─────────────────────────────────
function renderStatisticsScreen() {
  const stats = Statistics.get();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('statPlayed', stats.played);
  set('statWins', stats.wins);
  set('statLosses', stats.losses);
  set('statDraws', stats.draws);
  set('statStreak', stats.streak);
  set('statBestStreak', stats.bestStreak);
  set('statAiWins', stats.aiWins);
  set('statAiLosses', stats.aiLosses);
  set('statFavMode', formatFavMode(stats.favoriteMode));

  // Win rate
  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
  set('statWinRate', stats.played > 0 ? `${winRate}%` : '—');

  // Fix: average game time
  const avg = stats.played > 0 ? Math.round(stats.totalDuration / stats.played) : 0;
  set('statAvgTime', stats.played > 0 ? formatDuration(avg) : '—');

  // Graph
  const canvas = document.getElementById('statsGraph');
  if (canvas) {
    requestAnimationFrame(() => Statistics.renderGraph(canvas));
  }

  // Match history — improved cards
  const histEl = document.getElementById('statsHistory');
  if (histEl) {
    histEl.innerHTML = '';
    if (stats.history.length === 0) {
      histEl.innerHTML = '<p class="empty-state">No games played yet.</p>';
    } else {
      stats.history.slice(0, 30).forEach(game => {
        const item = document.createElement('div');
        item.className = 'history-item';

        const date = new Date(game.date).toLocaleDateString(undefined, { month:'short', day:'numeric' });
        const time = new Date(game.date).toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });

        let resultIcon, resultClass;
        if (game.winner === 'draw') {
          resultIcon = '🤝'; resultClass = 'hist-draw';
        } else if (game.humanPlayer && game.winner === game.humanPlayer) {
          resultIcon = '✅'; resultClass = 'hist-win';
        } else if (game.humanPlayer) {
          resultIcon = '❌'; resultClass = 'hist-loss';
        } else {
          resultIcon = game.winner === 'X' ? '🔵' : '🟢'; resultClass = '';
        }

        const modeIcon = game.mode === 'ultimate' ? '👑' : '🎮';
        const vsStr = game.vsAI ? `vs AI (${game.difficulty || 'med'})` : 'vs Human';
        const durStr = game.duration ? formatDuration(game.duration) : '';
        const resultText = game.winner === 'draw' ? 'Draw'
          : (game.humanPlayer
              ? (game.winner === game.humanPlayer ? 'Won' : 'Lost')
              : `${game.winner} won`);

        item.innerHTML = `
          <div class="history-item-main">
            <span class="hist-result ${resultClass}">${resultIcon} ${resultText}</span>
            <span class="hist-mode">${modeIcon} ${game.mode === 'ultimate' ? 'Ultimate' : 'Classic'} ${vsStr}</span>
          </div>
          <div class="history-item-meta">
            <span>${date} ${time}</span>
            ${durStr ? `<span>⏱ ${durStr}</span>` : ''}
          </div>
        `;
        histEl.appendChild(item);
      });
    }
  }
}

function formatFavMode(key) {
  if (!key) return '—';
  const map = {
    'classic_hvh': 'Classic HvH',
    'classic_ai': 'Classic vs AI',
    'ultimate_hvh': 'Ultimate HvH',
    'ultimate_ai': 'Ultimate vs AI',
  };
  return map[key] || key;
}

function formatDuration(sec) {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec/60)}m ${sec%60}s`;
}

// ── Achievements screen ───────────────────────────────
function renderAchievementsScreen() {
  const achs = Achievements.getAll();
  const listEl = document.getElementById('achList');
  if (!listEl) return;
  listEl.innerHTML = '';

  const coins = Storage.get('coins');
  const achBal = document.getElementById('achCoinBalance');
  if (achBal) achBal.textContent = coins;

  // Show unlock count
  const unlockCount = achs.filter(a => a.unlocked).length;
  const countEl = document.getElementById('achUnlockCount');
  if (countEl) countEl.textContent = `${unlockCount} / ${achs.length} Unlocked`;

  achs.forEach(ach => {
    const pct = Math.round(ach.progressValue * 100);
    const item = document.createElement('div');
    item.className = 'ach-item' + (ach.unlocked ? ' unlocked' : '');
    item.innerHTML = `
      <div class="ach-icon">${ach.icon}</div>
      <div class="ach-body">
        <div class="ach-name-row">
          <span class="ach-name">${ach.name}</span>
          ${ach.unlocked ? '<span class="ach-unlocked-badge">✓</span>' : ''}
        </div>
        <div class="ach-desc">${ach.description}</div>
        <div class="ach-progress-wrap" title="${pct}% complete">
          <div class="ach-progress-bar" style="width:${pct}%"></div>
        </div>
        <div class="ach-reward">${ach.unlocked ? '✅ Unlocked' : `🪙 ${ach.coinReward} coins`}</div>
      </div>
    `;
    listEl.appendChild(item);
  });
}

// ── Replay screen ─────────────────────────────────────
function renderReplayScreen() {
  const step = Replay.getCurrentStep();
  const infoEl = document.getElementById('replayInfo');
  const stepEl = document.getElementById('replayStepDisplay');
  if (infoEl) infoEl.textContent = `Move ${step.step} / ${step.total}`;
  if (stepEl) stepEl.textContent = `${step.step} / ${step.total}`;

  // Render board
  const wrap = document.getElementById('replayBoardWrap');
  if (!wrap) return;
  if (!wrap.querySelector('.replay-board')) {
    // Build board once
    const board = document.createElement('div');
    board.className = 'replay-board';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'classic-cell';
      cell.dataset.idx = i;
      board.appendChild(cell);
    }
    wrap.appendChild(board);
  }

  const cells = wrap.querySelectorAll('.classic-cell');
  const colors = Storage.get('pieceColors');
  step.board.forEach((val, i) => {
    cells[i].textContent = val || '';
    cells[i].classList.toggle('player-x', val === 'X');
    cells[i].classList.toggle('player-o', val === 'O');
    cells[i].classList.remove('winner');
    cells[i].style.setProperty('--x-color', colors.x);
    cells[i].style.setProperty('--o-color', colors.o);
  });

  if (step.winPattern) {
    step.winPattern.forEach(i => cells[i].classList.add('winner'));
  }

  document.getElementById('replayPrevBtn').disabled = step.step === 0;
  document.getElementById('replayNextBtn').disabled = step.step === step.total;
}

function wireReplayEvents() {
  document.getElementById('replayPrevBtn')?.addEventListener('click', () => {
    Replay.stepBack();
    renderReplayScreen();
  });
  document.getElementById('replayNextBtn')?.addEventListener('click', () => {
    Replay.stepForward();
    renderReplayScreen();
  });
}

// ── Dialog ────────────────────────────────────────────
/**
 * Show a modal dialog.
 * @param {string} title
 * @param {string} message
 * @param {Array<{label: string, action: Function|null}>} buttons
 */
export function showDialog(title, message, buttons = []) {
  const overlay = document.getElementById('dialogOverlay');
  const titleEl = document.getElementById('dialogTitle');
  const msgEl = document.getElementById('dialogMessage');
  const actionsEl = document.getElementById('dialogActions');

  titleEl.textContent = title;
  msgEl.textContent = message;
  actionsEl.innerHTML = '';

  (buttons.length > 0 ? buttons : [{ label: 'OK', action: null }]).forEach(btn => {
    const b = document.createElement('button');
    b.className = 'dialog-btn';
    b.textContent = btn.label;
    b.addEventListener('click', () => {
      closeDialog();
      if (typeof btn.action === 'function') btn.action();
    });
    actionsEl.appendChild(b);
  });

  overlay.style.display = '';
  overlay.setAttribute('aria-hidden', 'false');
  // Focus first button
  setTimeout(() => actionsEl.querySelector('button')?.focus(), 50);
}

function closeDialog() {
  const overlay = document.getElementById('dialogOverlay');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
}

// Keyboard dismiss
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDialog();
});

// ── Toast ─────────────────────────────────────────────
/**
 * Show a temporary toast notification.
 * @param {string} title
 * @param {string} message
 */
export function showToast(title, message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<strong>${title}</strong>${message ? `<span>${message}</span>` : ''}`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, 3000);

  Sound.play('unlock');
}

// ── Boot ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Update the turn indicator glow to reflect the current player.
 * Also updates score item active/inactive highlight.
 * @param {string} elementId - the turn indicator element id
 * @param {'X'|'O'} player
 */
export function updateTurnGlow(elementId, player) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.remove('player-x-active', 'player-o-active');
  el.classList.add(player === 'X' ? 'player-x-active' : 'player-o-active');

  // Highlight active player's score column
  // Determine parent game screen
  const screenPrefix = elementId.startsWith('classic') ? 'classic' : 'ultimate';
  const scoresEl = document.getElementById(screenPrefix + 'Scores');
  if (scoresEl) {
    const items = scoresEl.querySelectorAll('.score-item:not(.score-draw)');
    items.forEach((item, idx) => {
      // idx 0 = X player, idx 1 = O player
      const isActive = (idx === 0 && player === 'X') || (idx === 1 && player === 'O');
      item.classList.toggle('active-player', isActive);
      item.classList.toggle('inactive-player', !isActive);
    });
  }
}
