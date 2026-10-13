/**
 * Room Code Generator
 * Tạo mã phòng unique cho online multiplayer
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Bỏ các ký tự dễ nhầm: I, O, 0, 1

/**
 * Generate random room code
 * @param {number} length - Độ dài code (default: 6)
 * @returns {string} Room code (VD: "A3B7K2")
 */
function generateRoomCode(length = 6) {
    let code = '';
    for (let i = 0; i < length; i++) {
        code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return code;
}

/**
 * Generate unique room code (kiểm tra không trùng)
 * @param {Map} existingRooms - Map của các room hiện tại
 * @param {number} length - Độ dài code
 * @returns {string} Unique room code
 */
function generateUniqueRoomCode(existingRooms, length = 6) {
    let code;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
        code = generateRoomCode(length);
        attempts++;
        
        if (attempts > maxAttempts) {
            // Nếu thử quá nhiều lần, tăng độ dài code
            length++;
            attempts = 0;
        }
    } while (existingRooms.has(code));
    
    return code;
}

/**
 * Validate room code format
 * @param {string} code - Room code cần validate
 * @returns {boolean} True nếu valid
 */
function isValidRoomCode(code) {
    if (!code || typeof code !== 'string') return false;
    
    // Code phải 4-10 ký tự, chỉ chứa chữ cái và số
    const regex = /^[A-Z0-9]{4,10}$/;
    return regex.test(code.toUpperCase());
}

/**
 * Format room code để dễ đọc (VD: "A3B7K2" -> "A3B-7K2")
 * @param {string} code - Room code
 * @returns {string} Formatted code
 */
function formatRoomCode(code) {
    if (!code) return '';
    
    // Thêm dấu gạch ngang sau mỗi 3 ký tự
    return code.toUpperCase().match(/.{1,3}/g)?.join('-') || code;
}

module.exports = {
    generateRoomCode,
    generateUniqueRoomCode,
    isValidRoomCode,
    formatRoomCode
};
