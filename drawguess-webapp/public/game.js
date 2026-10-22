// public/game.js
(() => {
  console.log('\n=== [GAME.JS] SCRIPT LOADED ===');
  console.log('Current URL:', window.location.href);
  console.log('URL Search:', window.location.search);
  
  // --- CONFIGURATION ---

  const SERVER_URL_NET = 'https://your-drawguess-server.onrender.com'; 

  // Khi deploy, bạn sẽ đổi URL này thành địa chỉ server online của bạn
  const SERVER_URL_LAN_DEFAULT = 'http://localhost:3001';

  function getServerUrl() {
    console.log('\n=== [GAME.JS] GET SERVER URL ===');
    const savedUrl = localStorage.getItem('dg:server_url');
    console.log('Saved URL in localStorage:', savedUrl);
    if (savedUrl) {
      console.log('Using saved URL:', savedUrl);
      return savedUrl;
    }

    // Tự động phát hiện nếu đang ở mạng LAN
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Đề xuất địa chỉ LAN nếu truy cập qua IP nội bộ
    const isLanAccess = window.location.hostname.startsWith('192.168.') || 
                        window.location.hostname.startsWith('10.');

    let suggestedUrl = SERVER_URL_NET;
    if (isLocalhost) {
        suggestedUrl = SERVER_URL_LAN_DEFAULT;
    } else if (isLanAccess) {
        // Lấy IP từ chính URL đang truy cập, nhưng đổi port thành 3001
        suggestedUrl = `http://${window.location.hostname}:3001`;
    }
    
    const userUrl = prompt(`Enter Server Address:\n(Press OK for suggested)`, suggestedUrl);
    
    const finalUrl = userUrl || suggestedUrl;
    console.log('Final URL selected:', finalUrl);
    localStorage.setItem('dg:server_url', finalUrl);
    return finalUrl;
  }
  
  // Lấy địa chỉ server từ config
  const serverUrl = window.DRAWGUESS_CONFIG ? window.DRAWGUESS_CONFIG.getServerUrl() : getServerUrl();
  console.log('Server URL:', serverUrl);

  // Kết nối đến namespace /game của Server Core
  console.log('Creating socket connection to:', `${serverUrl}/game`);
  const socket = io(`${serverUrl}/game`, {
    reconnectionAttempts: 5,
    timeout: 10000,
    transports: ['websocket', 'polling']
  });

  // Game state
  console.log('\n=== [GAME.JS] LOADING GAME STATE ===');
  const playerName = localStorage.getItem('dg:name') || 'Player';
  const playerAvatar = localStorage.getItem('dg:avatar') || '😀';
  console.log('Player name from localStorage:', playerName);
  console.log('Player avatar from localStorage:', playerAvatar);
  let myPlayerId = null;
  let currentDrawerId = null;
  let isDrawer = false;
  let allPlayers = [];
  let gameOver = false;
  let roundActive = false;
  
  // UI Elements
  const chatPanel = document.getElementById('chatPanel');
  const palettePanel = document.getElementById('palettePanel');
  const chatInput = document.getElementById('chatInput');
  const sendChatBtn = document.getElementById('sendChat');
  const chatMessages = document.getElementById('chatMessages');
  const canvas = document.getElementById('drawCanvas');
  const ctx = canvas.getContext('2d');
  const drawingStatus = document.getElementById('drawingStatus');
  const colorGrid = document.getElementById('colorGrid');
  const brushSizeInput = document.getElementById('brushSize');
  const brushSizeLabel = document.getElementById('brushSizeLabel');
  const wordModal = document.getElementById('wordModal');
  const wordChoices = document.getElementById('wordChoices');
  const wordHint = document.getElementById('wordHint');
  const timerEl = document.getElementById('timer');
  const roundEl = document.getElementById('round');
  const totalRoundsEl = document.getElementById('totalRounds');
  const shareRoomBtn = document.getElementById('shareRoomBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const leaveRoomBtn = document.getElementById('leaveRoomBtn');
  const continueGameBtn = document.getElementById('continueGameBtn');
  const playersPanel = document.querySelector('.players-panel');
  const resultsModal = document.getElementById('resultsModal');
  const resultsRows = document.getElementById('resultsRows');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const restartStatus = document.getElementById('restartStatus');
  let restartPending = false;

  function resetRestartButton() {
    restartPending = false;
    playAgainBtn.disabled = false;
    playAgainBtn.textContent = 'Play Again';
    restartStatus.textContent = '';
  }

  function restartGame() {
    if (restartPending) return;
    if (!socket.connected) {
      restartStatus.textContent = 'Connection lost. Please wait for the server to reconnect.';
      return;
    }
    restartPending = true;
    playAgainBtn.disabled = true;
    playAgainBtn.textContent = 'Restarting...';
    restartStatus.textContent = 'Starting a new game for everyone...';
    socket.timeout(8000).emit('restart-game', (error, response) => {
      // game-reset can arrive before the acknowledgement, or from another player.
      if (!restartPending) return;
      resetRestartButton();
      if (error) {
        restartStatus.textContent = 'The server did not respond. Restart or update the game server, then try again.';
      } else if (!response?.success) {
        restartStatus.textContent = response?.message || 'Unable to restart the game. Please try again.';
      }
    });
  }

  // Drawing state
  let isDrawing = false;
  let currentColor = '#000000';
  let currentTool = 'pen';
  let brushSize = 5;
  let lastX = 0;
  let lastY = 0;

  // --- SOCKET EVENT HANDLERS ---
  
  socket.on('connect', () => {
    myPlayerId = socket.id;
    addSystemMessage(`✅ Connected to server! Joining room...`);
    
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    const password = localStorage.getItem('dg:roomPassword') || '';

    // LOG CHI TIẾT ĐỂ DEBUG
    console.log('=== DEBUG JOIN ROOM ===');
    console.log('roomId from URL:', roomId);
    console.log('playerName (global):', playerName);
    console.log('playerAvatar (global):', playerAvatar);
    console.log('password:', password ? '***' : '(empty)');
    console.log('localStorage dg:name:', localStorage.getItem('dg:name'));
    console.log('localStorage dg:avatar:', localStorage.getItem('dg:avatar'));
    console.log('localStorage dg:roomPassword:', localStorage.getItem('dg:roomPassword'));
    console.log('======================');

    if (!roomId || !playerName) {
        console.error('❌ VALIDATION FAILED!');
        console.error('roomId:', roomId, '| playerName:', playerName);
        alert(`Error: Missing room or player info.\nRoom: ${roomId}\nPlayer: ${playerName}\nReturning to lobby.`);
        window.location.href = 'index.html';
        return;
    }
    
    console.log('✅ Validation passed, emitting join-game...');
    // Gửi sự kiện join-game với thông tin từ biến global
    socket.emit('join-game', { playerName, playerAvatar, roomId, password });

    // Xóa mật khẩu khỏi localStorage sau khi đã sử dụng
    localStorage.removeItem('dg:roomPassword');
  });

  socket.on('join-error', (data) => {
    alert(data.message);
    window.location.href = 'index.html'; 
  });

  socket.on('connect_error', (err) => {
    addSystemMessage(`❌ Connection failed: ${err.message}. Please check server address and refresh.`);
  });

  socket.on('game-state', (data) => {
    roundActive = data.phase === 'drawing';
    allPlayers = data.players;
    currentDrawerId = data.currentDrawer;
    isDrawer = (currentDrawerId === myPlayerId);
    
    updatePlayersList();
    updateRoleUI();
    
    roundEl.textContent = data.round;
    totalRoundsEl.textContent = data.maxRounds;
    timerEl.textContent = data.timeLeft;
  });

  socket.on('player-joined', (data) => {
    allPlayers = data.players;
    updatePlayersList();
    addSystemMessage(`${data.player.name} has joined the game!`);
  });

  socket.on('player-left', (data) => {
    allPlayers = data.players;
    updatePlayersList();
    addSystemMessage(`${data.playerName} has left the game.`);
  });
  
  // Sự kiện mới từ server tái cấu trúc
  socket.on('choose-word', (data) => {
    console.log('=== [CLIENT] CHOOSE-WORD EVENT ===');
    console.log('isDrawer:', isDrawer);
    console.log('myPlayerId:', myPlayerId);
    console.log('currentDrawerId:', currentDrawerId);
    console.log('Words:', data.words);
    
    // Event choose-word chỉ được gửi đến drawer, nên luôn hiện modal
    // Không cần kiểm tra isDrawer vì server đã filter
    console.log('✅ Showing word selection modal...');
    showWordSelection(data.words);
  });

  socket.on('word-selected', (data) => {
    roundActive = true;
    // Người vẽ thấy từ gốc, không che
    wordHint.textContent = `DRAW THIS: ${data.word}`;
    drawingStatus.textContent = `Your word is: "${data.word}"`;
  });

  socket.on('word-hint', (data) => {
    roundActive = true;
    wordHint.textContent = `GUESS THIS: ${data.hint.split('').join(' ')}`;
    const drawer = allPlayers.find(p => p.id === currentDrawerId);
    drawingStatus.textContent = `${drawer ? drawer.name : 'Someone'} is drawing...`;
    addSystemMessage(`The word has ${data.length} letters. Good luck!`);
  });

  socket.on('next-round', (data) => {
    roundActive = false;
    stopDrawing();
    wordModal.classList.add('hidden');
    wordChoices.replaceChildren();
    if (data.players) allPlayers = data.players;
    if (data.timeLeft !== undefined) timerEl.textContent = data.timeLeft;
    if (data.maxRounds !== undefined) totalRoundsEl.textContent = data.maxRounds;
    console.log('=== [CLIENT] NEXT-ROUND EVENT ===');
    console.log('Round:', data.round);
    console.log('New drawer ID:', data.currentDrawer);
    console.log('My player ID:', myPlayerId);
    
    currentDrawerId = data.currentDrawer;
    isDrawer = (currentDrawerId === myPlayerId);
    console.log('Am I the drawer?', isDrawer);
    
    roundEl.textContent = data.round;
    
    clearCanvas();
    wordHint.textContent = 'GUESS THIS: _ _ _ _ _';
    
    updateRoleUI();
    updatePlayersList();
    
    addSystemMessage(`🎮 Round ${data.round} has started!`);
    console.log('=== [CLIENT] NEXT-ROUND COMPLETE ===\n');
  });

  socket.on('timer-update', (data) => {
    timerEl.textContent = data.timeLeft;
  });

  socket.on('round-end', (data) => {
    roundActive = false;
    stopDrawing();
    wordModal.classList.add('hidden');
    addSystemMessage(`⏰ Time's up! The word was: "${data.word}"`);
    data.scores.forEach(({ id, score }) => {
      const player = allPlayers.find(p => p.id === id);
      if (player) player.score = score;
    });
    updatePlayersList();
    wordHint.textContent = `Word was: ${data.word}`;
  });

  socket.on('game-over', (data) => {
    resetRestartButton();
    addSystemMessage('🎉 Game Over! Thanks for playing! 🎉');
    gameOver = true;
    roundActive = false;
    stopDrawing();
    isDrawer = false;
    wordModal.classList.add('hidden');
    closeSettingsModal();
    palettePanel.style.display = 'none';
    chatInput.disabled = true;
    sendChatBtn.disabled = true;
    drawingStatus.textContent = 'Game over';
    allPlayers = data.scores;
    updatePlayersList();
    resultsRows.replaceChildren();
    [...allPlayers].sort((a, b) => b.score - a.score).forEach((player, index) => {
      const row = document.createElement('tr');
      const rank = document.createElement('td');
      rank.textContent = `#${index + 1}`;
      const identity = document.createElement('td');
      const playerInfo = document.createElement('div');
      playerInfo.className = 'results-player';
      const avatar = document.createElement('span');
      avatar.className = 'results-avatar';
      avatar.textContent = player.avatar || '😀';
      const name = document.createElement('span');
      name.textContent = player.name;
      playerInfo.append(avatar, name);
      identity.append(playerInfo);
      const score = document.createElement('td');
      score.textContent = player.score || 0;
      row.append(rank, identity, score);
      resultsRows.append(row);
    });
    resultsModal.classList.remove('hidden');
    resultsModal.setAttribute('aria-hidden', 'false');
    playAgainBtn.focus();
  });

  socket.on('game-reset', (data) => {
    resetRestartButton();
    gameOver = false;
    roundActive = false;
    localStorage.removeItem('dg:roomPassword');
    resultsModal.classList.add('hidden');
    resultsModal.setAttribute('aria-hidden', 'true');
    resultsRows.replaceChildren();
    wordModal.classList.add('hidden');
    wordChoices.replaceChildren();
    closeSettingsModal();
    allPlayers = data.players;
    currentDrawerId = data.currentDrawer;
    isDrawer = currentDrawerId === myPlayerId;
    stopDrawing();
    clearCanvas();
    currentColor = '#000000';
    currentTool = 'pen';
    brushSize = 5;
    lastX = 0;
    lastY = 0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    brushSizeInput.value = 5;
    brushSizeLabel.textContent = '5';
    colorGrid.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === currentColor);
    });
    updateToolButtons();
    chatMessages.replaceChildren();
    chatInput.value = '';
    roundEl.textContent = data.round;
    totalRoundsEl.textContent = data.maxRounds;
    timerEl.textContent = data.timeLeft;
    wordHint.textContent = 'GUESS THIS: _ _ _ _ _';
    updatePlayersList();
    updateRoleUI();
    addSystemMessage('New game! Scores have been reset.');
    settingsBtn.focus();
  });

  socket.on('draw', (data) => {
    console.log('[CLIENT] Received draw event, isDrawer:', isDrawer);
    if (!isDrawer && !gameOver && roundActive) {
      console.log('[CLIENT] Drawing remote stroke:', data);
      drawRemote(data);
    }
  });

  socket.on('clear-canvas', () => {
    clearCanvas();
  });

  socket.on('chat-message', (data) => {
    addChatMessage(data.playerName, data.message);
  });

  socket.on('correct-answer', (data) => {
    const player = allPlayers.find(p => p.id === data.playerId);
    if (player) player.score = data.score;
    updatePlayersList();
    addChatMessage('System', `🎉 ${data.playerName} guessed the word! +${data.points} points`, 'correct');
  });

  // --- UI & DRAWING LOGIC (Hầu như giữ nguyên) ---

  function showWordSelection(words) {
    wordChoices.innerHTML = '';
    words.forEach(word => {
      const btn = document.createElement('button');
      btn.className = 'word-choice-btn';
      btn.textContent = word;
      btn.addEventListener('click', () => selectWord(word));
      wordChoices.appendChild(btn);
    });
    wordModal.classList.remove('hidden');
  }

  function selectWord(word) {
    wordModal.classList.add('hidden');
    socket.emit('select-word', { word });
  }

  function setupTools() {
    console.log('[setupTools] Setting up tools...');
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.dataset.tool || 'pen';
        console.log('[setupTools] Tool changed to:', currentTool);
      });
    });
    
    // Brush size
    if (brushSizeInput) {
      brushSizeInput.addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
        if (brushSizeLabel) brushSizeLabel.textContent = `${brushSize}px`;
      });
    }
  }

  function setupDrawing() {
    console.log('[setupDrawing] Setting up canvas events, canvas:', canvas);
    if (!canvas) {
      console.error('[setupDrawing] Canvas not found!');
      return;
    }
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    console.log('[setupDrawing] Canvas events attached successfully');
  }

  function startDrawing(e) {
    console.log('[startDrawing] isDrawer:', isDrawer);
    if (!isDrawer || !roundActive || gameOver) {
      console.log('[startDrawing] Not drawer, ignoring');
      return;
    }
    isDrawing = true;
    const { x, y } = getCanvasCoords(e);
    lastX = x;
    lastY = y;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    console.log('[startDrawing] Started at', x, y);
  }

  function draw(e) {
    if (!isDrawing || !isDrawer || !roundActive || gameOver) return;
    const { x, y } = getCanvasCoords(e);
    
    drawLocal(lastX, lastY, x, y, currentColor, brushSize, currentTool);
    
    socket.emit('draw', {
      x0: lastX, y0: lastY, x1: x, y1: y,
      color: currentColor, size: brushSize, tool: currentTool
    });
    
    lastX = x;
    lastY = y;
  }

  function stopDrawing() {
    isDrawing = false;
    ctx.beginPath();
  }
  
  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function drawLocal(x0, y0, x1, y1, color, size, tool) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }
    
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  
  function drawRemote(data) {
    console.log('[CLIENT] drawRemote called with:', data);
    drawLocal(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.tool);
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function setupPalette() {
    const colorButtons = colorGrid.querySelectorAll('.color-btn');
    colorButtons.forEach((btn, idx) => {
      if (idx === 0) btn.classList.add('active');
      btn.addEventListener('click', () => {
        colorButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentColor = btn.dataset.color;
        currentTool = 'pen';
        updateToolButtons();
      });
    });

    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        if (tool === 'clear') {
          clearCanvas();
          socket.emit('clear-canvas');
          return;
        }
        currentTool = tool;
        updateToolButtons();
      });
    });

    brushSizeInput.addEventListener('input', (e) => {
      brushSize = parseInt(e.target.value);
      brushSizeLabel.textContent = brushSize;
    });
  }

  function updateToolButtons() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === currentTool);
    });
  }

  function setupChat() {
    const sendMessage = () => {
      const msg = chatInput.value.trim();
      if (!msg) return;
      chatInput.value = '';
      socket.emit('chat-message', { message: msg });
    };
    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  function addChatMessage(sender, text, type = '') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${type}`;
    // Basic sanitization
    const sanitizedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    msgDiv.innerHTML = `<strong>${sender}:</strong> ${sanitizedText}`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addSystemMessage(text) {
    addChatMessage('System', text, 'system');
  }

  function updatePlayersList() {
    const sorted = [...allPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));
    playersPanel.innerHTML = '';
    sorted.forEach((player, idx) => {
      const div = document.createElement('div');
      div.className = 'player-item';
      if (player.id === currentDrawerId) div.classList.add('active');
      div.innerHTML = `
        <span class="rank">#${idx + 1}</span>
        <span class="player-avatar">${player.avatar}</span>
        <span class="player-name">${player.name}${player.id === myPlayerId ? ' (You)' : ''}</span>
        <span class="player-score">${player.score || 0} pts</span>
      `;
      playersPanel.appendChild(div);
    });
  }

  function updateRoleUI() {
    console.log('[updateRoleUI] isDrawer:', isDrawer, 'myPlayerId:', myPlayerId, 'currentDrawerId:', currentDrawerId);
    
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChat');
    
    if (isDrawer) {
      // Người vẽ: Hiện palette + chat view-only
      console.log('[updateRoleUI] Setting up DRAWER mode');
      palettePanel.style.display = 'flex';
      chatPanel.style.display = 'flex';
      
      // Disable chat input cho người vẽ
      if (chatInput) {
        chatInput.disabled = true;
        chatInput.placeholder = '🚫 Drawer cannot chat (view only)';
        chatInput.style.opacity = '0.5';
      }
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.style.opacity = '0.5';
      }
      
      canvas.style.cursor = 'crosshair';
      drawingStatus.textContent = 'Waiting to choose a word...';
    } else {
      // Người đoán: Ẩn palette, hiện chat
      console.log('[updateRoleUI] Setting up GUESSER mode');
      chatPanel.style.display = 'flex';
      palettePanel.style.display = 'none';
      
      // Enable chat input
      if (chatInput) {
        chatInput.disabled = false;
        chatInput.placeholder = 'Type your guess...';
        chatInput.style.opacity = '1';
      }
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
      }
      
      canvas.style.cursor = 'default';
      drawingStatus.textContent = 'Waiting for the drawer...';
    }
  }
  

  // Helper function for copy fallback
  function promptCopyFallback(text) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    alert(`Room code copied: ${text}`);
  }

  function closeSettingsModal() {
    if (!settingsModal) return;
    settingsModal.classList.add('hidden');
    settingsModal.setAttribute('aria-hidden', 'true');
  }

  function openSettingsModal() {
    if (!settingsModal) return;
    settingsModal.classList.remove('hidden');
    settingsModal.setAttribute('aria-hidden', 'false');
    continueGameBtn?.focus();
  }

  function leaveRoom() {
    socket.disconnect();
    localStorage.removeItem('dg:roomPassword');
    window.location.href = 'index.html';
  }

  function init() {
    console.log('[init] Initializing game...');
    addSystemMessage('🔌 Connecting to server...');
    
    // --- SHARE ROOM CODE ---
    if (shareRoomBtn) {
      shareRoomBtn.addEventListener('click', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const roomCode = urlParams.get('room');
        
        if (!roomCode) {
          alert('Room code not found!');
          return;
        }
        
        if (navigator.clipboard) {
          navigator.clipboard.writeText(roomCode).then(() => {
            shareRoomBtn.textContent = '✅ Copied!';
            shareRoomBtn.style.background = '#4cd964';
            setTimeout(() => {
              shareRoomBtn.textContent = '📋 Share';
              shareRoomBtn.style.background = '';
            }, 2000);
          }).catch(() => {
            promptCopyFallback(roomCode);
          });
        } else {
          promptCopyFallback(roomCode);
        }
      });
    }

    settingsBtn?.addEventListener('click', openSettingsModal);
    continueGameBtn?.addEventListener('click', closeSettingsModal);
    leaveRoomBtn?.addEventListener('click', leaveRoom);
    playAgainBtn.addEventListener('click', restartGame);
    document.getElementById('mainMenuBtn').addEventListener('click', leaveRoom);
    resultsModal.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const mainMenuBtn = document.getElementById('mainMenuBtn');
      if (event.shiftKey && document.activeElement === playAgainBtn) {
        event.preventDefault();
        mainMenuBtn.focus();
      } else if (!event.shiftKey && document.activeElement === mainMenuBtn) {
        event.preventDefault();
        playAgainBtn.focus();
      }
    });
    settingsModal?.addEventListener('click', (event) => {
      if (event.target === settingsModal) closeSettingsModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !settingsModal?.classList.contains('hidden')) {
        closeSettingsModal();
      }
    });

    // --- KHỞI TẠO ---
    console.log('[init] Setting up palette, tools, drawing...');
    setupPalette();
    setupTools();
    setupDrawing();
    setupChat();
    console.log('[init] Initialization complete!');
  }

  init();
})();
