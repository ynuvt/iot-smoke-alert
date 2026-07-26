require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const { connectDB, getDatabaseStatus } = require('./config/db');
const { initEmailService } = require('./services/emailService');
const Sensor = require('./models/Sensor');

const sensorRoutes = require('./routes/sensorRoutes');
const alertRoutes = require('./routes/alertRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow connections from any origin (development environment)
    methods: ['GET', 'POST']
  }
});

// Port configuration
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Attach Socket.IO instance to HTTP requests so API routes can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);

// Simple healthcheck route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    database: getDatabaseStatus(),
    timestamp: new Date()
  });
});

// Socket.IO Events
io.on('connection', (socket) => {
  console.log(`[WebSocket] New client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });
});

// Startup Routine
async function bootstrap() {
  // Connect to database
  await connectDB();
  
  // Seed database (if MongoDB is active and empty)
  try {
    await Sensor.seedInitial();
  } catch (err) {
    console.error('Error during initial sensor seeding:', err.message);
  }

  // Initialize Email Service
  await initEmailService();

  // Start HTTP Server
  server.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 Smart Building Digital Twin Server running on port ${PORT}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`📡 WebSocket server initialized.`);
    console.log(`================================================================`);
  });
}

bootstrap().catch(err => {
  console.error('Critical failure during server bootstrap:', err);
  process.exit(1);
});
