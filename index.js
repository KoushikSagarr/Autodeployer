const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

let buildCount = 0;
let buildHistory = [];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Trigger a dummy Jenkins build
app.post('/trigger-build', (req, res) => {
  buildCount++;
  const build = {
    number: buildCount,
    result: 'SUCCESS',
    duration: Math.floor(Math.random() * 5000) + 1000,
    timestamp: Date.now()
  };
  buildHistory.unshift(build);
  if (buildHistory.length > 10) buildHistory.pop();

  io.emit('status', {
    type: 'info',
    message: `Triggered build #${build.number}`,
    time: new Date().toISOString()
  });

  res.json({ message: `Build #${build.number} triggered.` });
});

// Build history endpoint
app.get('/build-history', (req, res) => {
  res.json({ builds: buildHistory });
});

// WebSocket log stream simulation
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('watch-log', (buildNumber) => {
    const interval = setInterval(() => {
      socket.emit('log-update', `Build #${buildNumber}: [${new Date().toLocaleTimeString()}] still running...\n`);
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      socket.emit('log-update', `Build #${buildNumber}: completed.\n`);
      socket.emit('log-done');
    }, 5000);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
