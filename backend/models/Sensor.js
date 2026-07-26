const mongoose = require('mongoose');
const { getIsInMemory, memoryStore } = require('../config/db');

const SensorSchema = new mongoose.Schema({
  sensorId: { type: String, required: true, unique: true },
  roomName: { type: String, required: true },
  floor: { type: Number, required: true },
  status: { type: String, enum: ['SAFE', 'WARNING', 'ALERT'], default: 'SAFE' },
  smokeLevel: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

let MongooseSensor;
try {
  MongooseSensor = mongoose.model('Sensor', SensorSchema);
} catch (e) {
  MongooseSensor = mongoose.model('Sensor');
}

const InMemorySensor = {
  find: async () => {
    return memoryStore.sensors;
  },
  findOne: async (query) => {
    return memoryStore.sensors.find(s => s.sensorId === query.sensorId);
  },
  findOneAndUpdate: async (query, update, options = {}) => {
    let sensor = memoryStore.sensors.find(s => s.sensorId === query.sensorId);
    if (!sensor) {
      if (options.upsert) {
        sensor = { sensorId: query.sensorId, ...update, lastUpdated: new Date() };
        memoryStore.sensors.push(sensor);
      } else {
        return null;
      }
    } else {
      Object.assign(sensor, update, { lastUpdated: new Date() });
    }
    return sensor;
  },
  seedInitial: async () => {
    if (!getIsInMemory()) {
      const count = await MongooseSensor.countDocuments();
      if (count === 0) {
        // Use copy of memory store sensors
        await MongooseSensor.insertMany(memoryStore.sensors.map(s => ({ ...s })));
        console.log('Seeded initial sensors in MongoDB');
      }
    }
  }
};

const Sensor = {
  find: (query) => getIsInMemory() ? InMemorySensor.find() : MongooseSensor.find(query),
  findOne: (query) => getIsInMemory() ? InMemorySensor.findOne(query) : MongooseSensor.findOne(query),
  findOneAndUpdate: (query, update, options) => getIsInMemory() 
    ? InMemorySensor.findOneAndUpdate(query, update, options) 
    : MongooseSensor.findOneAndUpdate(query, update, options),
  seedInitial: () => InMemorySensor.seedInitial()
};

module.exports = Sensor;
