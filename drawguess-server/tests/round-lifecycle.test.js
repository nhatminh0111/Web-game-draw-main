const test = require('node:test');
const assert = require('node:assert/strict');
const setupGame = require('../sockets/mainHandler');

test('timer, drawer rotation and word selection stay synchronized across rounds and replay', () => {
  const events = [];
  const intervals = new Map();
  const delays = new Map();
  let nextId = 1;
  let connect;
  const originals = { setInterval, clearInterval, setTimeout, clearTimeout };
  global.setInterval = callback => { const id = nextId++; intervals.set(id, callback); return id; };
  global.clearInterval = id => intervals.delete(id);
  global.setTimeout = callback => { const id = nextId++; delays.set(id, callback); return id; };
  global.clearTimeout = id => delays.delete(id);
  try {
    const namespace = {
      sockets: new Map(), use() {}, emit() {},
      on(event, callback) { if (event === 'connection') connect = callback; },
      to() { return { emit(event, data) { events.push({ event, data }); } }; },
      adapter: { rooms: new Map() },
    };
    setupGame(namespace);
    const client = id => {
      const callbacks = new Map();
      const socket = {
        id, join() {}, to: namespace.to,
        on(event, callback) { callbacks.set(event, callback); },
        emit(event, data) { events.push({ event, data, target: id }); },
      };
      namespace.sockets.set(id, socket);
      connect(socket);
      return (event, ...args) => callbacks.get(event)(...args);
    };
    const alice = client('timer-alice');
    const bob = client('timer-bob');
    alice('lobby:create-room', { playerName: 'Alice', roomId: 'CLOCK123', roundTime: 2, maxRounds: 3 }, () => {});
    alice('join-game', { playerName: 'Alice', roomId: 'CLOCK123' });
    bob('join-game', { playerName: 'Bob', roomId: 'CLOCK123' });
    const last = event => events.filter(item => item.event === event).at(-1);
    const tick = () => { assert.equal(intervals.size, 1); [...intervals.values()][0](); };
    for (let round = 1; round <= 3; round++) {
      const drawer = round === 2 ? bob : alice;
      const guesser = round === 2 ? alice : bob;
      assert.equal(last('next-round').data.round, round);
      assert.equal(last('next-round').data.timeLeft, 2);
      assert.equal(last('next-round').data.currentDrawer, round === 2 ? 'timer-bob' : 'timer-alice');
      assert.ok(events.indexOf(last('next-round')) < events.indexOf(last('choose-word')));
      assert.equal(intervals.size, 0, 'timer waits for word selection');
      guesser('select-word', { word: 'wrong-player' });
      assert.equal(intervals.size, 0);
      drawer('select-word', { word: 'cat' });
      const selections = events.filter(item => item.event === 'word-selected').length;
      drawer('select-word', { word: 'duplicate' });
      assert.equal(events.filter(item => item.event === 'word-selected').length, selections);
      tick();
      assert.equal(last('timer-update').data.timeLeft, 1);
      tick();
      assert.equal(last('timer-update').data.timeLeft, 0);
      assert.equal(intervals.size, 0);
      if (round < 3) {
        const before = events.filter(item => item.event === 'word-selected').length;
        guesser('select-word', { word: 'too-early' });
        assert.equal(events.filter(item => item.event === 'word-selected').length, before);
        assert.equal(delays.size, 1);
        const [id, callback] = [...delays][0];
        delays.delete(id);
        callback();
      }
    }
    assert.equal(last('game-over').data.scores.length, 2);
    assert.equal(intervals.size, 0);
    assert.equal(delays.size, 0);
    bob('restart-game');
    assert.equal(last('next-round').data.round, 1);
    assert.equal(last('next-round').data.currentDrawer, 'timer-alice');
    assert.equal(last('next-round').data.timeLeft, 75);
    assert.equal(intervals.size, 0);
    alice('select-word', { word: 'sun' });
    tick();
    assert.equal(last('timer-update').data.timeLeft, 74);
  } finally {
    Object.assign(global, originals);
  }
});
