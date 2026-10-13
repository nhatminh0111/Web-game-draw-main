require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const mainSocketHandler = require('./sockets/mainHandler');
const adminSocketHandler = require('./sockets/adminHandler');

const app = express();

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Serve static files from webapp
const webappPath = path.join(__dirname, '../drawguess-webapp/public');
app.use(express.static(webappPath));

// API endpoint
app.get('/api', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'DrawGuess Server is running!',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Serve index.html for root and game routes
app.get('/', (req, res) => {
  res.sendFile(path.join(webappPath, 'index.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(webappPath, 'game.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const gameNamespace = io.of('/game');
const adminNamespace = io.of('/admin');

mainSocketHandler(gameNamespace);
adminSocketHandler(adminNamespace, gameNamespace);

server.listen(config.PORT, () => {
  console.log(`🚀 Server Core is running on http://localhost:${config.PORT}`);
  console.log(`🎮 Game Namespace is at /game`);
  console.log(`🛠️ Admin Namespace is at /admin`);
});