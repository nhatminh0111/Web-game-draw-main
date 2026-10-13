/**
 * Client Configuration
 * Automatically detects server URL based on environment
 */

const CONFIG = {
  // Server URL - auto-detect based on environment
  getServerUrl: function() {
    // Check if custom server URL is set (for production)
    if (window.DRAWGUESS_SERVER_URL) {
      return window.DRAWGUESS_SERVER_URL;
    }
    
    // Development: use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    
    // Production: use same origin (backend serves frontend)
    // This works because Render hosts both on same URL
    return window.location.origin;
  }
};

// Make it globally available
window.DRAWGUESS_CONFIG = CONFIG;
