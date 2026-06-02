const storageKey = 'daifugo-state';
const playerId = parsePlayerId();
let selectedRank = null;
let selectedIds = new Set();
let state = null;
let channel = null;

const elements = {
  landing: document.getElementById('landing'),
  gameArea: document.getElementById('game-area'),
  yourSeat: document.getElementById('your-seat'),
  yourHandCount: document.getElementById('your-hand-count'),
  opponentHandCount: document.getElementById('opponent-hand-count'),
  turnPlayer: document.getElementById('turn-player'),
  tableLabel: document.getElementById('table-label'),
  lastPlayer: document.getElementById('last-player'),
  hand: document.getElementById('hand'),
  tableArea: document.getElementById('table-area'),
  log: document.getElementById('game-log'),
  playButton: document.getElementById('play-button'),
  passButton: document.getElementById('pass-button'),
  restartButton: document.getElementById('restart-button'),
};

const ranks = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const rankNames = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2' };
const suits = ['♠', '♥', '♦', '♣'];

function parsePlayerId() {
  const params = new URLSearchParams(window.location.search);
  const value = parseInt(params.get('player'), 10);
  return value === 1 || value === 2 ? value : null;
}

function shuffle(cards) {
  return cards
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.value);
}

function createDeck() {
  const cards = [];
  ranks.forEach((rank) => {
    suits.forEach((suit) => {
      cards.push({ id: `${rank}-${suit}-${Math.random().toString(36).slice(2, 6)}`, rank, suit });
    });
  });
  return shuffle(cards);
}

function rankLabel(rank) {
  return rankNames[rank] || String(rank);
}

function compareRank(a, b) {
  return a - b;
}

function sortHand(hand) {
  return [...hand].sort((a, b) => {
    const diff = compareRank(a.rank, b.rank);
    if (diff !== 0) return diff;
    return suits.indexOf(a.suit) - suits.indexOf(b.suit);
  });
}

function buildInitialState() {
  const deck = createDeck();
  const half = deck.length / 2;
  return {
    currentPlayer: 1,
    lastPlayer: null,
    currentTrick: null,
    passCount: 0,
    gameOver: false,
    lastUpdated: Date.now(),
    players: {
      1: { hand: sortHand(deck.slice(0, half)) },
      2: { hand: sortHand(deck.slice(half)) },
    },
    history: ['大富豪を開始しました。プレイヤー1からスタートします。'],
  };
}

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return buildInitialState();
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.players?.[1] || !parsed?.players?.[2]) {
      return buildInitialState();
    }
    return parsed;
  } catch {
    return buildInitialState();
  }
}

function saveState() {
  state.lastUpdated = Date.now();
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (channel) {
    channel.postMessage({ type: 'state', state });
  }
}

function syncRemoteState(remote) {
  if (!remote || remote.lastUpdated <= state.lastUpdated) return;
  state = remote;
  selectedIds.clear();
  selectedRank = null;
  render();
}

function initSync() {
  try {
    channel = new BroadcastChannel('daifugo-room');
    channel.onmessage = (event) => {
      if (event.data?.type === 'state') {
        syncRemoteState(event.data.state);
      }
    };
  } catch {
    channel = null;
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey || !event.newValue) return;
    try {
      const next = JSON.parse(event.newValue);
      syncRemoteState(next);
    } catch {
      // ignore invalid state updates
    }
  });
}

function isYourTurn() {
  return playerId === state.currentPlayer && !state.gameOver;
}

function getOpponentId() {
  return playerId === 1 ? 2 : 1;
}

function render() {
  if (!playerId) {
    elements.landing.classList.remove('hidden');
    elements.gameArea.classList.add('hidden');
    return;
  }

  elements.landing.classList.add('hidden');
  elements.gameArea.classList.remove('hidden');
  elements.yourSeat.textContent = playerId;
  elements.yourHandCount.textContent = state.players[playerId].hand.length;
  elements.opponentHandCount.textContent = state.players[getOpponentId()].hand.length;
  elements.turnPlayer.textContent = `プレイヤー ${state.currentPlayer}`;

  if (!state.currentTrick) {
    elements.tableLabel.textContent = '場は空です。どんな枚数でも出せます。';
    elements.lastPlayer.textContent = state.lastPlayer ? `プレイヤー ${state.lastPlayer}` : 'まだ誰も出していません';
  } else {
    elements.tableLabel.textContent = `${state.currentTrick.count}枚の ${rankLabel(state.currentTrick.rank)}`;
    elements.lastPlayer.textContent = `プレイヤー ${state.currentTrick.player}`;
  }

  renderTable();
  renderHand();
  renderLog();
  elements.playButton.disabled = !isYourTurn() || selectedIds.size === 0;
  elements.passButton.disabled = !isYourTurn();
}

function renderHand() {
  const handContainer = elements.hand;
  handContainer.innerHTML = '';
  const hand = state.players[playerId].hand;

  hand.forEach((card) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'card';
    if (selectedIds.has(card.id)) button.classList.add('selected');
    if (!isYourTurn()) button.classList.add('disabled');
    button.innerHTML = `
      <div class="corner"><span class="rank">${rankLabel(card.rank)}</span><span class="suit">${card.suit}</span></div>
      <div class="name">${card.suit}</div>
      <div class="rank">${rankLabel(card.rank)}</div>
    `;
    button.addEventListener('click', () => {
      if (!isYourTurn()) return;
      toggleCardSelection(card.id, card.rank);
    });
    handContainer.appendChild(button);
  });
}

function renderTable() {
  const table = elements.tableArea;
  table.innerHTML = '';
  if (!state.currentTrick) {
    table.textContent = '場は空です。';
    return;
  }
  state.currentTrick.cards.forEach((card) => {
    const element = document.createElement('div');
    element.className = 'card disabled';
    element.innerHTML = `
      <div class="corner"><span class="rank">${rankLabel(card.rank)}</span><span class="suit">${card.suit}</span></div>
      <div class="name">${card.suit}</div>
      <div class="rank">${rankLabel(card.rank)}</div>
    `;
    table.appendChild(element);
  });
}

function renderLog() {
  const logBox = elements.log;
  logBox.innerHTML = '';
  state.history.slice(0, 12).forEach((message) => {
    const p = document.createElement('p');
    p.textContent = message;
    logBox.appendChild(p);
  });
}

function addLog(message) {
  state.history.unshift(`${new Date().toLocaleTimeString()} - ${message}`);
  if (state.history.length > 30) {
    state.history = state.history.slice(0, 30);
  }
}

function toggleCardSelection(cardId, cardRank) {
  if (selectedIds.has(cardId)) {
    selectedIds.delete(cardId);
    if (selectedIds.size === 0) selectedRank = null;
    render();
    return;
  }
  if (selectedRank !== null && selectedRank !== cardRank) {
    addLog('同じランクのカードだけを選んでください。');
    renderLog();
    return;
  }
  selectedIds.add(cardId);
  selectedRank = cardRank;
  render();
}

function getSelectedCards() {
  return state.players[playerId].hand.filter((card) => selectedIds.has(card.id));
}

function isValidPlay(cards) {
  if (cards.length === 0) return false;
  if (!cards.every((card) => card.rank === cards[0].rank)) return false;
  if (!state.currentTrick) return true;
  return cards.length === state.currentTrick.count && compareRank(cards[0].rank, state.currentTrick.rank) > 0;
}

function playCards() {
  if (!isYourTurn()) return;
  const cards = getSelectedCards();
  if (!isValidPlay(cards)) {
    addLog('出せるのは場と同じ枚数で、より強いランクのカードだけです。');
    renderLog();
    return;
  }
  state.players[playerId].hand = sortHand(state.players[playerId].hand.filter((card) => !selectedIds.has(card.id)));
  state.currentTrick = {
    cards: cards.map((card) => ({ ...card })),
    rank: cards[0].rank,
    count: cards.length,
    player: playerId,
  };
  state.lastPlayer = playerId;
  state.passCount = 0;
  addLog(`プレイヤー ${playerId} が ${cards.length}枚の ${rankLabel(cards[0].rank)} を出しました。`);
  if (state.players[playerId].hand.length === 0) {
    state.gameOver = true;
    addLog(`プレイヤー ${playerId} の勝利です！`);
  } else {
    state.currentPlayer = getOpponentId();
  }
  selectedIds.clear();
  selectedRank = null;
  saveState();
  render();
}

function passTurn() {
  if (!isYourTurn()) return;
  const opponent = getOpponentId();
  if (state.currentTrick && state.currentTrick.player !== playerId) {
    addLog(`プレイヤー ${playerId} はパスしました。場が流れます。`);
    state.currentTrick = null;
    state.passCount = 0;
    state.currentPlayer = state.lastPlayer || opponent;
  } else {
    addLog(`プレイヤー ${playerId} はパスしました。`);
    state.passCount += 1;
    state.currentPlayer = opponent;
  }
  selectedIds.clear();
  selectedRank = null;
  saveState();
  render();
}

function restartGame() {
  state = buildInitialState();
  selectedIds.clear();
  selectedRank = null;
  saveState();
  render();
}

function setupEvents() {
  elements.playButton.addEventListener('click', playCards);
  elements.passButton.addEventListener('click', passTurn);
  elements.restartButton.addEventListener('click', restartGame);
}

function start() {
  initSync();
  state = loadState();
  setupEvents();
  render();
}

start();
