const express = require('express');
const router = express.Router();
const Sensor = require('../models/Sensor');
const AlertLog = require('../models/AlertLog');
const { sendAlertEmail } = require('../services/emailService');

// Thresholds for status determination
const ALERT_THRESHOLD = 250;
const WARNING_THRESHOLD = 80;

function getStatusFromSmokeLevel(smokeLevel) {
  if (smokeLevel >= ALERT_THRESHOLD) return 'ALERT';
  if (smokeLevel >= WARNING_THRESHOLD) return 'WARNING';
  return 'SAFE';
}

// GET /api/sensors - Retrieve all sensors
router.get('/', async (req, res) => {
  try {
    const sensors = await Sensor.find();
    res.json(sensors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sensors', details: err.message });
  }
});

// POST /api/sensors/telemetry - Incoming sensor data
router.post('/telemetry', async (req, res) => {
  const { sensorId, smokeLevel } = req.body;

  if (!sensorId || smokeLevel === undefined) {
    return res.status(400).json({ error: 'Missing sensorId or smokeLevel' });
  }

  try {
    // Find current sensor details
    let sensor = await Sensor.findOne({ sensorId });
    if (!sensor) {
      return res.status(404).json({ error: `Sensor ${sensorId} not found in database.` });
    }

    const previousStatus = sensor.status;
    let newStatus = getStatusFromSmokeLevel(smokeLevel);
    
    // LATCH ALERT state: if it was already in ALERT, force it to stay in ALERT
    // until manual clearance via POST /api/sensors/clear
    if (previousStatus === 'ALERT') {
      newStatus = 'ALERT';
    }
    
    // Update sensor record
    const updatedSensor = await Sensor.findOneAndUpdate(
      { sensorId },
      { smokeLevel, status: newStatus },
      { new: true }
    );

    // If transitioned into ALERT status, create an AlertLog and trigger Email notification
    if (newStatus === 'ALERT' && previousStatus !== 'ALERT') {
      const alertData = {
        sensorId: updatedSensor.sensorId,
        roomName: updatedSensor.roomName,
        floor: updatedSensor.floor,
        status: 'ALERT',
        smokeLevel
      };
      const alertLog = await AlertLog.create(alertData);

      // Broadcast new alert event
      if (req.io) {
        req.io.emit('new-alert', alertLog);
      }

      // Send Email Alert asynchronously
      sendAlertEmail(updatedSensor).catch(err => console.error('Email trigger error:', err));
    } 
    // If warning transitions
    else if (newStatus === 'WARNING' && previousStatus === 'SAFE') {
      if (req.io) {
        req.io.emit('status-warning', { sensorId, roomName: updatedSensor.roomName, smokeLevel });
      }
    }

    // Broadcast the updated sensor state to all connected Socket.IO client dashboard pages
    if (req.io) {
      req.io.emit('sensor-update', updatedSensor);
    }

    res.json({ message: 'Telemetry updated successfully', sensor: updatedSensor });
  } catch (err) {
    console.error('Telemetry updates failed:', err);
    res.status(500).json({ error: 'Failed to update telemetry', details: err.message });
  }
});

// POST /api/sensors/clear - Clear a latched ALERT status manually
router.post('/clear', async (req, res) => {
  const { sensorId } = req.body;

  if (!sensorId) {
    return res.status(400).json({ error: 'Missing sensorId' });
  }

  try {
    const sensor = await Sensor.findOne({ sensorId });
    if (!sensor) {
      return res.status(404).json({ error: `Sensor ${sensorId} not found.` });
    }

    const previousStatus = sensor.status;
    const currentStatus = getStatusFromSmokeLevel(sensor.smokeLevel);

    const updatedSensor = await Sensor.findOneAndUpdate(
      { sensorId },
      { status: currentStatus },
      { new: true }
    );

    // If we are clearing a locked ALERT status, resolve the AlertLog record
    if (previousStatus === 'ALERT') {
      try {
        const history = await AlertLog.find();
        const activeAlert = history.find(a => a.sensorId === sensorId && !a.resolvedAt);
        if (activeAlert) {
          await AlertLog.findOneAndUpdate(
            { _id: activeAlert._id },
            { resolvedAt: new Date() }
          );
        }
      } catch (logErr) {
        console.error('Failed to resolve alert log:', logErr);
      }
    }

    // Broadcast update to all dashboard connections
    if (req.io) {
      req.io.emit('sensor-update', updatedSensor);
      req.io.emit('alert-cleared', { sensorId });
    }

    res.json({ message: 'Sensor alert cleared successfully', sensor: updatedSensor });
  } catch (err) {
    console.error('Failed to clear alert:', err);
    res.status(500).json({ error: 'Failed to clear alert', details: err.message });
  }
});

// POST /api/sensors/reset - Reset all sensors to SAFE state for testing
router.post('/reset', async (req, res) => {
  try {
    const sensors = await Sensor.find();
    for (const sensor of sensors) {
      await Sensor.findOneAndUpdate(
        { sensorId: sensor.sensorId },
        { status: 'SAFE', smokeLevel: 10 }
      );
    }

    // Resolve any remaining active alerts
    const alerts = await AlertLog.find();
    for (const alert of alerts) {
      if (!alert.resolvedAt) {
        await AlertLog.findOneAndUpdate({ _id: alert._id }, { resolvedAt: new Date() });
      }
    }

    const updatedSensors = await Sensor.find();
    
    // Broadcast reset event
    if (req.io) {
      req.io.emit('system-reset', updatedSensors);
    }

    res.json({ message: 'All sensors reset to SAFE state.', sensors: updatedSensors });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset sensors', details: err.message });
  }
});

module.exports = router;
