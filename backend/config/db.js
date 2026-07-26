const mongoose = require('mongoose');

let isInMemory = false;

// In-Memory Storage Fallback
const memoryStore = {
  sensors: [],
  alerts: []
};

// Seed initial sensors into memory store
const initialSensors = [
  { sensorId: 'SN-001', roomName: 'admin', floor: 1, status: 'SAFE', smokeLevel: 15, lastUpdated: new Date() },
  { sensorId: 'SN-002', roomName: '213', floor: 2, status: 'SAFE', smokeLevel: 12, lastUpdated: new Date() },
  { sensorId: 'SN-003', roomName: '314', floor: 3, status: 'SAFE', smokeLevel: 10, lastUpdated: new Date() },
  { sensorId: 'SN-004', roomName: '622', floor: 6, status: 'SAFE', smokeLevel: 18, lastUpdated: new Date() }
];

memoryStore.sensors.push(...initialSensors);

async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/digital_twin';
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000 // Timeout quickly to trigger fallback
    });
    console.log('MongoDB Connected Successfully.');
  } catch (err) {
    console.error('================================================================');
    console.error('WARNING: MongoDB connection failed!');
    console.error(`Error: ${err.message}`);
    console.error('Falling back to IN-MEMORY DATABASE mode for local execution.');
    console.error('All data will be stored in-memory and reset when the server restarts.');
    console.error('================================================================');
    isInMemory = true;
  }
}

function getDatabaseStatus() {
  if (isInMemory) {
    return 'In-Memory (Fallback)';
  }
  return mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
}

module.exports = {
  connectDB,
  getDatabaseStatus,
  getIsInMemory: () => isInMemory,
  memoryStore
};
