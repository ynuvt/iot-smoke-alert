const mongoose = require('mongoose');
const { getIsInMemory, memoryStore } = require('../config/db');

const AlertLogSchema = new mongoose.Schema({
  sensorId: { type: String, required: true },
  roomName: { type: String, required: true },
  floor: { type: Number, required: true },
  status: { type: String, required: true },
  smokeLevel: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null }
});

let MongooseAlertLog;
try {
  MongooseAlertLog = mongoose.model('AlertLog', AlertLogSchema);
} catch (e) {
  MongooseAlertLog = mongoose.model('AlertLog');
}

const InMemoryAlertLog = {
  find: async () => {
    return [...memoryStore.alerts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },
  create: async (data) => {
    const newAlert = {
      _id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date(),
      resolvedAt: null,
      ...data
    };
    memoryStore.alerts.push(newAlert);
    return newAlert;
  },
  findOneAndUpdate: async (query, update) => {
    const alert = memoryStore.alerts.find(a => a._id === query._id);
    if (alert) {
      Object.assign(alert, update);
    }
    return alert;
  }
};

const AlertLog = {
  find: (query) => getIsInMemory() ? InMemoryAlertLog.find() : MongooseAlertLog.find(query).sort({ timestamp: -1 }),
  create: (data) => getIsInMemory() ? InMemoryAlertLog.create(data) : MongooseAlertLog.create(data),
  findOneAndUpdate: (query, update) => getIsInMemory() 
    ? InMemoryAlertLog.findOneAndUpdate(query, update) 
    : MongooseAlertLog.findOneAndUpdate(query, update)
};

module.exports = AlertLog;
