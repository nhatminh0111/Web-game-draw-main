const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadGame() {
  const elements = new Map();
  const handlers = new Map();
  const sent = [];
  let acknowledge;
  function element() {
    const classes = new Set(['hidden']);
    return {
      textContent: '', style: {}, dataset: {}, disabled: false, children: [], listeners: {},
      classList: {
        add(value) { classes.add(value); }, remove(value) { classes.delete(value); },
        contains(value) { return classes.has(value); }, toggle() {},
      },
      addEventListener(event, callback) { this.listeners[event] = callback; },
      querySelectorAll() { return []; },
      append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); },
      replaceChildren() { this.children = []; },
      setAttribute() {}, focus() {},
      getContext() { return { clearRect() {}, beginPath() {} }; },
    };
  }
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
    querySelector() { return element(); }, querySelectorAll() { return []; },
    createElement: element, addEventListener() {},
  };
  const socket = {
    connected: true,
    on(event, callback) { handlers.set(event, callback); },
    timeout(ms) { assert.equal(ms, 8000); return this; },
    emit(event, callback) { sent.push(event); acknowledge = callback; },
  };
  const source = fs.readFileSync(path.join(__dirname, '../../drawguess-webapp/public/game.js'), 'utf8');
  vm.runInNewContext(source, {
    document, io: () => socket,
    window: { location: { href: 'http://localhost/game?room=TEST123', search: '?room=TEST123' }, DRAWGUESS_CONFIG: { getServerUrl: () => 'http://localhost:3001' } },
    localStorage: { getItem() { return null; }, removeItem() {} },
    console: { log() {}, error() {} },
  });
  return { document, handlers, sent, socket, ack: (...args) => acknowledge(...args) };
}

test('real Play Again click emits restart and resets UI when server broadcasts', () => {
  const app = loadGame();
  app.handlers.get('game-over')({ scores: [{ id: 'a', name: 'Alice', score: 5, avatar: 'A' }] });
  const button = app.document.getElementById('playAgainBtn');
  button.listeners.click();
  assert.deepEqual(app.sent, ['restart-game']);
  assert.equal(button.disabled, true);
  assert.equal(button.textContent, 'Restarting...');
  app.handlers.get('game-reset')({ players: [], currentDrawer: null, round: 1, maxRounds: 3, timeLeft: 75 });
  app.ack(null, { success: true });
  assert.equal(button.disabled, false);
  assert.equal(app.document.getElementById('resultsModal').classList.contains('hidden'), true);
  assert.equal(app.document.getElementById('round').textContent, 1);
  assert.equal(app.document.getElementById('timer').textContent, 75);
});

test('Play Again explains disconnected, timed-out and rejected requests and allows retry', () => {
  const app = loadGame();
  const button = app.document.getElementById('playAgainBtn');
  const status = app.document.getElementById('restartStatus');
  app.socket.connected = false;
  button.listeners.click();
  assert.equal(app.sent.length, 0);
  assert.match(status.textContent, /Connection lost/);
  app.socket.connected = true;
  button.listeners.click();
  app.ack(new Error('timeout'));
  assert.equal(button.disabled, false);
  assert.match(status.textContent, /server did not respond/);
  button.listeners.click();
  app.ack(null, { success: false, message: 'Room missing' });
  assert.equal(button.disabled, false);
  assert.equal(status.textContent, 'Room missing');
});

test('new round restores timer before word picker and selection starts the round UI', () => {
  const app = loadGame();
  const get = id => app.document.getElementById(id);
  app.handlers.get('timer-update')({ timeLeft: 0 });
  app.handlers.get('next-round')({ currentDrawer: null, round: 2, maxRounds: 3, timeLeft: 75 });
  assert.equal(get('timer').textContent, 75);
  assert.equal(get('wordModal').classList.contains('hidden'), true);
  app.handlers.get('choose-word')({ words: ['cat', 'dog', 'sun'] });
  assert.equal(get('wordModal').classList.contains('hidden'), false);
  get('wordChoices').children[0].listeners.click();
  assert.equal(app.sent.at(-1), 'select-word');
  assert.equal(get('wordModal').classList.contains('hidden'), true);
  app.handlers.get('word-selected')({ word: 'cat' });
  assert.equal(get('wordHint').textContent, 'DRAW THIS: cat');
  app.handlers.get('timer-update')({ timeLeft: 74 });
  assert.equal(get('timer').textContent, 74);
});
