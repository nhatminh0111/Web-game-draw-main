const config = require('../config');

class GameRoom {
  constructor(roomId, broadcastCallback, options = {}) {
    this.roomId = roomId;
    this.broadcast = broadcastCallback;
    
    // Room settings
    this.password = options.password || null;
    this.hasPassword = !!this.password;
    this.roomType = options.roomType || 'public'; // 'public', 'private', 'custom'
    this.customName = options.customName || null; // Tên tùy chỉnh (nếu có)
    this.createdBy = options.createdBy || null; // Người tạo phòng
    this.createdAt = Date.now();
    
    // Game settings
    this.maxPlayers = options.maxPlayers || 8;
    this.maxRounds = options.maxRounds || config.MAX_ROUNDS;
    this.roundTime = options.roundTime || config.ROUND_TIME;
    
    // Game state
    this.players = [];
    this.scores = new Map();
    this.correctGuessers = new Set();
    this.currentDrawerId = null;
    this.currentWord = null;
    this.round = 1;
    this.timeLeft = this.roundTime;
    this.timer = null;
    this.nextRoundTimer = null;
    this.phase = 'waiting';
    this.isGameStarted = false;
    this.isGameOver = false;
  }

  resetGame() {
    this.stopTimer();
    this.cancelNextRound();
    const connectedPlayers = this.players;
    const freshRoom = new GameRoom(this.roomId, this.broadcast, {
      customName: this.customName,
    });
    Object.assign(this, freshRoom);
    connectedPlayers.forEach(player => {
      player.events = [];
      this.addPlayer(player);
    });
  }

  addPlayer(player) {
    this.players.push(player);
    this.scores.set(player.id, 0);
    if (this.players.length === 1) {
      this.currentDrawerId = player.id;
    }
  }

  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    this.scores.delete(playerId);
    
    if (this.currentDrawerId === playerId && this.players.length > 0) {
      this.currentDrawerId = this.players[0].id;
      // TODO: Add logic to restart the round if the drawer leaves
    }
  }

  nextDrawer() {
    if (this.players.length === 0) {
      this.currentDrawerId = null;
      return;
    }
    const currentIndex = this.players.findIndex(p => p.id === this.currentDrawerId);
    const nextIndex = (currentIndex + 1) % this.players.length;
    this.currentDrawerId = this.players[nextIndex].id;
  }

  resetRoundGuesses() {
    this.correctGuessers.clear();
  }

  startTimer(onTimerEnd) {
    console.log(`[TIMER] Starting timer for room ${this.roomId}, duration: ${this.roundTime}s`);
    this.timeLeft = this.roundTime;
    if (this.timer) {
      console.log('[TIMER] Clearing existing timer');
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.broadcast('timer-update', { timeLeft: this.timeLeft });
      
      if (this.timeLeft <= 0) {
        console.log(`[TIMER] Time's up for room ${this.roomId}! Calling onTimerEnd...`);
        clearInterval(this.timer);
        this.timer = null;
        onTimerEnd();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  cancelNextRound() {
    if (this.nextRoundTimer !== null) {
      clearTimeout(this.nextRoundTimer);
      this.nextRoundTimer = null;
    }
  }

  getState() {
    return {
      players: this.players.map(p => ({
        id: p.id, name: p.name, avatar: p.avatar, score: this.scores.get(p.id) || 0
      })),
      currentDrawer: this.currentDrawerId,
      round: this.round,
      maxRounds: this.maxRounds,
      timeLeft: this.timeLeft,
      phase: this.phase,
    };
  }

  getPublicInfo() {
    return {
      roomId: this.roomId,
      customName: this.customName,
      roomType: this.roomType,
      playerCount: this.players.length,
      maxPlayers: this.maxPlayers,
      hasPassword: this.hasPassword,
      isGameStarted: this.isGameStarted,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      maxRounds: this.maxRounds,
      currentRound: this.round,
    };
  }
  
  canJoin() {
    // Không cho join nếu game đã bắt đầu hoặc phòng đầy
    return !this.isGameStarted && this.players.length < this.maxPlayers;
  }

  isValidPassword(password) {
    return !this.hasPassword || this.password === password;
  }
}

module.exports = GameRoom;
