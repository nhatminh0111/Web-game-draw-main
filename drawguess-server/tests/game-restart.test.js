const test = require('node:test');
const assert = require('node:assert/strict');
const GameRoom = require('../game/GameRoom');
const setupGame = require('../sockets/mainHandler');
const config = require('../config');

test('reset restores fresh room defaults and keeps only room identity and connected players', () => {
  const broadcast = () => {};
  const room = new GameRoom('KEEP123', broadcast, {
    customName: 'Friends', password: 'secret', roomType: 'private',
    createdBy: 'Alice', maxPlayers: 2, maxRounds: 9, roundTime: 15,
  });
  room.addPlayer({ id: 'alice', name: 'Alice', avatar: 'A', events: [1] });
  room.scores.set('alice', 100);
  room.correctGuessers.add('alice');
  room.currentWord = 'cat';
  room.round = 10;
  room.timeLeft = 0;
  room.isGameOver = true;
  room.isGameStarted = true;
  room.resetGame();
  const fresh = new GameRoom('KEEP123', broadcast, { customName: 'Friends' });
  fresh.addPlayer({ id: 'alice', name: 'Alice', avatar: 'A', events: [] });
  assert.deepEqual(room.getState(), fresh.getState());
  assert.equal(room.password, null);
  assert.equal(room.hasPassword, false);
  assert.equal(room.roomType, fresh.roomType);
  assert.equal(room.maxPlayers, fresh.maxPlayers);
  assert.equal(room.roundTime, config.ROUND_TIME);
  assert.equal(room.roomId, 'KEEP123');
  assert.equal(room.customName, 'Friends');
  assert.equal(room.createdBy, null);
  assert.equal(room.currentWord, null);
  assert.equal(room.correctGuessers.size, 0);
  assert.equal(room.isGameStarted, false);
  assert.equal(room.isGameOver, false);
  assert.deepEqual(room.players[0].events, []);
});

test('three-round results keep original identities and replay resets everyone once', () => {
  const events = [];
  let connect;
  let finishRound;
  const originalStartTimer = GameRoom.prototype.startTimer;
  const originalTimeout = global.setTimeout;
  GameRoom.prototype.startTimer = function (callback) { finishRound = callback; };
  global.setTimeout = callback => { callback(); return 0; };
  try {
    const namespace = {
      sockets: new Map(),
      use() {},
      on(event, callback) { if (event === 'connection') connect = callback; },
      emit() {},
      to() { return { emit(event, data) { events.push({ event, data }); } }; },
      adapter: { rooms: new Map() },
    };
    setupGame(namespace);
    function client(id) {
      const handlers = new Map();
      const socket = {
        id,
        on(event, callback) { handlers.set(event, callback); },
        emit(event, data) { events.push({ event, data, target: id }); },
        join() {},
        to: namespace.to,
      };
      namespace.sockets.set(id, socket);
      connect(socket);
      return (event, ...args) => handlers.get(event)(...args);
    }
    const alice = client('alice');
    const bob = client('bob');
    alice('restart-game', response => {
      assert.equal(response.success, false);
      assert.match(response.message, /no longer connected/);
    });
    alice('lobby:create-room', { playerName: 'Alice', roomId: 'TEST123', maxRounds: 3 }, result => {
      assert.equal(result.success, true);
    });
    alice('join-game', { playerName: 'Alice', playerAvatar: 'A', roomId: 'TEST123' });
    bob('join-game', { playerName: 'Bob', playerAvatar: 'B', roomId: 'TEST123' });
    alice('select-word', { word: 'cat' });
    bob('chat-message', { message: 'cat' });
    finishRound();
    bob('select-word', { word: 'dog' });
    finishRound();
    alice('select-word', { word: 'bird' });
    bob('chat-message', { message: 'bird' });
    finishRound();
    const results = events.filter(item => item.event === 'game-over');
    assert.equal(results.length, 1);
    assert.deepEqual(results[0].data.scores.map(p => [p.name, p.avatar]), [['Alice', 'A'], ['Bob', 'B']]);
    assert.ok(results[0].data.scores[1].score > results[0].data.scores[0].score);
    bob('restart-game', response => assert.equal(response.success, true));
    alice('restart-game', response => assert.equal(response.success, false));
    const resets = events.filter(item => item.event === 'game-reset');
    assert.equal(resets.length, 1);
    assert.equal(resets[0].data.round, 1);
    assert.equal(resets[0].data.currentDrawer, 'alice');
    assert.ok(resets[0].data.timeLeft > 0);
    assert.deepEqual(resets[0].data.players.map(p => p.score), [0, 0]);
    assert.equal(events.filter(item => item.event === 'next-round').length, 4);
    alice('select-word', { word: 'sun' });
    bob('chat-message', { message: 'sun' });
    assert.equal(events.filter(item => item.event === 'correct-answer').length, 3);
  } finally {
    GameRoom.prototype.startTimer = originalStartTimer;
    global.setTimeout = originalTimeout;
  }
});
