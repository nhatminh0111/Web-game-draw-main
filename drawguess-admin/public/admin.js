// public/admin.js
document.addEventListener('DOMContentLoaded', () => {
    // Kết nối đến cùng server core nhưng vào namespace /admin
    const SERVER_URL = localStorage.getItem('dg:server_url') || 'http://localhost:3001';
    const socket = io(`${SERVER_URL}/admin`);

    // UI Elements
    const connectionStatusEl = document.getElementById('connectionStatus');
    const dotEl = connectionStatusEl.querySelector('.dot');
    const playerCountEl = document.getElementById('playerCount');
    const roomCountEl = document.getElementById('roomCount');
    const roomListBodyEl = document.getElementById('roomList').querySelector('tbody');

    // Socket Event Handlers
    socket.on('connect', () => {
        dotEl.classList.remove('disconnected');
        dotEl.classList.add('connected');
        connectionStatusEl.innerHTML = '<span class="dot connected"></span> Connected';
        console.log('Connected to admin namespace!');
    });

    socket.on('disconnect', () => {
        dotEl.classList.remove('connected');
        dotEl.classList.add('disconnected');
        connectionStatusEl.innerHTML = '<span class="dot disconnected"></span> Disconnected';
        console.log('Disconnected from admin namespace.');
    });

    socket.on('system-stats', (data) => {
        console.log('Received stats:', data);
        
        // Cập nhật các thẻ card
        playerCountEl.textContent = data.playerCount || 0;
        roomCountEl.textContent = data.roomCount || 0;

        // Cập nhật bảng danh sách phòng
        updateRoomList(data.rooms);
    });

    function updateRoomList(rooms) {
        if (!rooms || rooms.length === 0) {
            roomListBodyEl.innerHTML = '<tr><td colspan="3">No active rooms.</td></tr>';
            return;
        }

        let html = '';
        rooms.forEach(room => {
            html += `
                <tr>
                    <td>${room.id}</td>
                    <td>${room.size}</td>
                    <td>
                        <button disabled>Kick</button>
                        <button disabled>Inspect</button>
                    </td>
                </tr>
            `;
        });
        roomListBodyEl.innerHTML = html;
    }
});