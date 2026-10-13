document.addEventListener('DOMContentLoaded', () => {
    console.log('\n=== [WEBAPP] APP.JS LOADED ===');
    // --- CẤU HÌNH & KẾT NỐI SOCKET ---
    const serverUrl = window.DRAWGUESS_CONFIG ? window.DRAWGUESS_CONFIG.getServerUrl() : 'http://localhost:3001';
    console.log('Connecting to server:', serverUrl);
    
    const socket = io(serverUrl + '/game', {
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ['websocket', 'polling']
    });
    console.log('Socket created, waiting for connection...');

    // --- LẤY CÁC THÀNH PHẦN GIAO DIỆN (UI ELEMENTS) ---
    const playerNameInput = document.getElementById('playerName');
    const avatarDisplay = document.getElementById('avatarDisplay');
    const prevAvatarBtn = document.getElementById('prevAvatar');
    const nextAvatarBtn = document.getElementById('nextAvatar');
    const roomListEl = document.getElementById('roomList');
    const refreshRoomsBtn = document.getElementById('refreshRoomsBtn');
    const quickPlayBtn = document.getElementById('quickPlayBtn');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const createRoomModal = document.getElementById('createRoomModal');
    const createRoomForm = document.getElementById('createRoomForm');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const newRoomIdInput = document.getElementById('newRoomId');
    const newRoomPassInput = document.getElementById('newRoomPass');

    // --- TRẠNG THÁI (STATE) ---
    const avatars = ['😀', '😎', '🤖', '🐱', '🐼', '👾', '🐸', '🦊', '🧑‍🎨', '🧠'];
    let currentAvatarIndex = 0;
    
    // --- XỬ LÝ SỰ KIỆN SOCKET ---
    socket.on('connect', () => {
        console.log('✅ Connected to lobby server!');
        console.log('Socket ID:', socket.id);
        console.log('Server URL:', serverUrl);
        document.querySelector('.room-item-placeholder').textContent = 'Loading rooms...';
        requestRoomList();
    });

    socket.on('connect_error', (err) => {
        console.error('❌ Connection error:', err);
        roomListEl.innerHTML = '<div class="room-item-placeholder" style="color: #e74c3c; font-weight: bold;">Could not connect to the server. Please check the address and refresh.</div>';
    });

    socket.on('disconnect', (reason) => {
        console.warn('⚠️ Disconnected from server:', reason);
    });

    socket.on('room-list-update', (rooms) => {
        renderRoomList(rooms);
    });

    // --- CÁC HÀM LOGIC ---

    function renderRoomList(rooms) {
        roomListEl.innerHTML = '';
        if (!rooms || rooms.length === 0) {
            roomListEl.innerHTML = '<div class="room-item-placeholder">No active rooms. Why not create one?</div>';
            return;
        }
        rooms.forEach(room => {
            const roomEl = document.createElement('div');
            roomEl.className = 'room-item';
            roomEl.dataset.roomId = room.roomId;
            roomEl.innerHTML = `
                <span class="room-name">${room.roomId} ${room.hasPassword ? '🔒' : ''}</span>
                <span class="room-players">${room.playerCount} players</span>
            `;
            roomEl.addEventListener('click', () => handleJoinRoom(room));
            roomListEl.appendChild(roomEl);
        });
    }

    function handleJoinRoom(room) {
        console.log('\n=== [WEBAPP] JOINING ROOM ===');
        console.log('Room:', room);
        // SỬA LỖI: Luôn kiểm tra và lưu thông tin trước khi hành động
        if (!validateAndSavePlayerInfo()) return;

        let password = '';
        if (room.hasPassword) {
            password = prompt(`Enter password for room "${room.roomId}":`);
            if (password === null) return;
        }
        
        localStorage.setItem('dg:roomPassword', password);
        const gameUrl = `game?room=${room.roomId}`;
        console.log('Redirecting to:', gameUrl);
        console.log('localStorage dg:name:', localStorage.getItem('dg:name'));
        console.log('localStorage dg:avatar:', localStorage.getItem('dg:avatar'));
        console.log('localStorage dg:roomPassword:', password ? '***' : '(empty)');
        window.location.href = gameUrl;
    }

    function requestRoomList() {
        socket.emit('get-room-list', (rooms) => {
            if (rooms) {
                renderRoomList(rooms);
            }
        });
    }

    function handleCreateRoom(e) {
        e.preventDefault();
        // SỬA LỖI: Luôn kiểm tra và lưu thông tin trước khi gửi yêu cầu
        if (!validateAndSavePlayerInfo()) return;

        const newRoomId = newRoomIdInput.value.trim();
        const newRoomPass = newRoomPassInput.value.trim();
        
        if (!newRoomId) {
            alert('Please enter a room name.');
            return;
        }
        
        // Lấy thông tin người chơi sau khi đã chắc chắn nó được lưu
        const playerData = getPlayerInfo();

        console.log('=== CREATING ROOM ===');
        console.log('playerName:', playerData.name);
        console.log('playerAvatar:', playerData.avatar);
        console.log('roomId:', newRoomId);
        console.log('password:', newRoomPass ? '***' : '(empty)');
        
        socket.emit('lobby:create-room', {
            playerName: playerData.name,
            playerAvatar: playerData.avatar,
            roomId: newRoomId,
            password: newRoomPass
        }, (response) => {
            console.log('=== CREATE ROOM RESPONSE ===');
            console.log('response:', response);
            
            if (response && response.success) {
                console.log('✅ Room created successfully:', response.roomId);
                localStorage.setItem('dg:roomPassword', newRoomPass);
                const gameUrl = `game?room=${response.roomId}`;
                console.log('Redirecting to:', gameUrl);
                closeCreateRoomModal();
                window.location.href = gameUrl;
            } else {
                console.error('❌ Failed to create room:', response);
                alert(`Error: ${response ? response.message : 'No response from server'}`);
            }
        });
    }

    function getPlayerInfo() {
        return {
            name: localStorage.getItem('dg:name'),
            avatar: localStorage.getItem('dg:avatar'),
        };
    }

    // SỬA LỖI: Đổi tên hàm để rõ ràng hơn và đảm bảo nó luôn lưu cả tên và avatar
    function validateAndSavePlayerInfo() {
        const name = playerNameInput.value.trim();
        console.log('\n=== [WEBAPP] VALIDATE PLAYER INFO ===');
        console.log('Player name input:', name);
        console.log('Current avatar index:', currentAvatarIndex);
        console.log('Current avatar:', avatars[currentAvatarIndex]);
        
        if (!name) {
            console.log('❌ Validation failed: No name entered');
            alert('Please enter your name before joining or creating a room!');
            playerNameInput.focus();
            return false;
        }
        localStorage.setItem('dg:name', name);
        localStorage.setItem('dg:avatar', avatars[currentAvatarIndex]); // Luôn lưu avatar hiện tại
        console.log('✅ Player info saved to localStorage');
        console.log('Saved name:', localStorage.getItem('dg:name'));
        console.log('Saved avatar:', localStorage.getItem('dg:avatar'));
        return true;
    }

    function renderAvatar() {
        avatarDisplay.textContent = avatars[currentAvatarIndex];
    }
    
    function restorePlayerInfo() {
        const savedName = localStorage.getItem('dg:name');
        if (savedName) {
            playerNameInput.value = savedName;
        }
        const savedAvatar = localStorage.getItem('dg:avatar');
        if (savedAvatar) {
            const idx = avatars.indexOf(savedAvatar);
            if (idx !== -1) {
                currentAvatarIndex = idx;
            }
        }
        renderAvatar();
    }

    // --- GẮN CÁC SỰ KIỆN VÀO GIAO DIỆN ---
    prevAvatarBtn.addEventListener('click', () => {
        currentAvatarIndex = (currentAvatarIndex - 1 + avatars.length) % avatars.length;
        renderAvatar();
    });

    nextAvatarBtn.addEventListener('click', () => {
        currentAvatarIndex = (currentAvatarIndex + 1) % avatars.length;
        renderAvatar();
    });

    // --- XỬ LÝ SỰ KIỆN SOCKET ---
    socket.on('connect_error', (err) => {
        console.error('❌ Connection error:', err);
        roomListEl.innerHTML = '<div class="room-item-placeholder" style="color: #e74c3c; font-weight: bold;">Could not connect to the server. Please check the address and refresh.</div>';
    });

    socket.on('disconnect', (reason) => {
        console.warn('⚠️ Disconnected from server:', reason);
    });

    socket.on('room-list-update', (rooms) => {
        renderRoomList(rooms);
    });

    function openCreateRoomModal() {
        const name = playerNameInput.value.trim();
        if (!name) {
            alert('Please enter your name first!');
            playerNameInput.focus();
            return;
        }
        createRoomModal.classList.remove('hidden');
        createRoomModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        newRoomIdInput.focus();
    }

    function closeCreateRoomModal() {
        createRoomModal.classList.add('hidden');
        createRoomModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        createRoomBtn.focus();
    }

    function handleQuickPlay() {
        console.log('\n=== [WEBAPP] QUICK PLAY ===');
        if (!validateAndSavePlayerInfo()) return;
        
        const playerData = getPlayerInfo();
        quickPlayBtn.disabled = true;
        quickPlayBtn.textContent = '⏳ Creating room...';
        
        socket.emit('lobby:quick-play', {
            playerName: playerData.name,
            playerAvatar: playerData.avatar
        }, (response) => {
            quickPlayBtn.disabled = false;
            quickPlayBtn.textContent = '🎮 Quick Play';
            
            if (response && response.success) {
                console.log('✅ Quick Play room created:', response.roomId);
                localStorage.setItem('dg:roomPassword', '');
                const gameUrl = `game?room=${response.roomId}`;
                console.log('Redirecting to:', gameUrl);
                window.location.href = gameUrl;
            } else {
                console.error('❌ Quick Play failed:', response);
                alert(`Error: ${response ? response.message : 'No response from server'}`);
            }
        });
    }

    refreshRoomsBtn.addEventListener('click', requestRoomList);
    quickPlayBtn.addEventListener('click', handleQuickPlay);
    createRoomBtn.addEventListener('click', openCreateRoomModal);
    closeModalBtn.addEventListener('click', closeCreateRoomModal);
    createRoomForm.addEventListener('submit', handleCreateRoom);
    createRoomModal.addEventListener('click', (event) => {
        if (event.target === createRoomModal) closeCreateRoomModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !createRoomModal.classList.contains('hidden')) {
            closeCreateRoomModal();
        }
    });

    // --- KHỞI TẠO ---
    restorePlayerInfo();
});
