/**
 * Smart Building Digital Twin - IoT Sensor Simulator CLI
 * 
 * Simulates multiple building sensors sending telemetry data to the backend API.
 * Provides interactive keypresses to trigger warning and critical alert events
 * in specific rooms for real-time visualization in the Digital Twin.
 */

const http = require('http');
const readline = require('readline');

const API_URL = 'http://localhost:5000/api/sensors/telemetry';

// Local list of sensors matching the database seeds
const sensors = [
  { sensorId: 'SN-001', roomName: 'admin', floor: 1, smokeLevel: 15 },
  { sensorId: 'SN-002', roomName: '213', floor: 2, smokeLevel: 12 },
  { sensorId: 'SN-003', roomName: '314', floor: 3, smokeLevel: 10 },
  { sensorId: 'SN-004', roomName: '622', floor: 6, smokeLevel: 18 }
];

// Send post request using built-in Node http client (no dependencies needed)
function postTelemetry(sensor) {
  const payload = JSON.stringify({
    sensorId: sensor.sensorId,
    smokeLevel: Math.round(sensor.smokeLevel)
  });

  const req = http.request('http://localhost:5000/api/sensors/telemetry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    // Consume response body to free up socket connection
    res.on('data', () => {});
  });

  req.on('error', (err) => {
    // Silent fail if server is temporarily offline
  });

  req.write(payload);
  req.end();
}

// Introduce slight random fluctuations to represent real-world ambient conditions
function updateAmbientLevels() {
  sensors.forEach(sensor => {
    // Only fluctuate if it is currently in safe mode (< 80 ppm)
    if (sensor.smokeLevel < 80) {
      const fluctuation = (Math.random() - 0.5) * 2;
      sensor.smokeLevel = Math.max(5, Math.min(45, sensor.smokeLevel + fluctuation));
    }
    postTelemetry(sensor);
  });
}

// Print clean UI panel to the terminal
function drawConsole() {
  // Clear console
  console.clear();
  console.log('================================================================');
  console.log('            🔥 IoT Building Sensor Simulator CLI 🔥             ');
  console.log('================================================================');
  console.log('📡 Status: Sending ambient telemetry data for all 4 zones.');
  console.log('🔗 Destination API: http://localhost:5000/api/sensors/telemetry');
  console.log('----------------------------------------------------------------');
  console.log('ZONE TELEMETRY MATRIX:');
  console.log('----------------------------------------------------------------');
  
  // Print status of all sensors
  sensors.forEach(s => {
    let statusLabel = 'SAFE   ';
    if (s.smokeLevel >= 250) statusLabel = '🚨 ALERT';
    else if (s.smokeLevel >= 80) statusLabel = '⚠️ WARN ';

    console.log(`[${s.sensorId}] ${s.roomName.padEnd(20)} | Floor ${s.floor} | Smoke: ${String(Math.round(s.smokeLevel)).padStart(3)} ppm | ${statusLabel}`);
  });

  console.log('----------------------------------------------------------------');
  console.log('SIMULATION TRIGGER OVERRIDES (Press key to toggle):');
  console.log('  [1] Trigger FIRE ALERT in admin (Floor 1)        -> 450 ppm');
  console.log('  [2] Trigger FIRE ALERT in 213 (Floor 2)          -> 380 ppm');
  console.log('  [3] Trigger FIRE ALERT in 314 (Floor 3)          -> 410 ppm');
  console.log('  [4] Trigger FIRE ALERT in 622 (Floor 6)          -> 480 ppm');
  console.log('  [w] Trigger GAS WARNING in admin (Floor 1)       -> 120 ppm');
  console.log('  [r] Reset ALL sensors to Safe Ambient levels     -> 8-18 ppm');
  console.log('  [q] Quit simulator');
  console.log('================================================================');
  console.print ? console.print() : null;
}

// Setup input listeners
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on('keypress', (str, key) => {
  if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
    console.log('\nSimulator shutdown.');
    process.exit();
  }

  switch (key.name) {
    case '1':
      sensors[0].smokeLevel = 450; // admin
      postTelemetry(sensors[0]);
      break;
    case '2':
      sensors[1].smokeLevel = 380; // 213
      postTelemetry(sensors[1]);
      break;
    case '3':
      sensors[2].smokeLevel = 410; // 314
      postTelemetry(sensors[2]);
      break;
    case '4':
      sensors[3].smokeLevel = 480; // 622
      postTelemetry(sensors[3]);
      break;
    case 'w':
      sensors[0].smokeLevel = 120; // admin (Warning)
      postTelemetry(sensors[0]);
      break;
    case 'r':
      sensors.forEach(s => {
        if (s.sensorId === 'SN-001') s.smokeLevel = 15;
        else if (s.sensorId === 'SN-002') s.smokeLevel = 12;
        else if (s.sensorId === 'SN-003') s.smokeLevel = 10;
        else if (s.sensorId === 'SN-004') s.smokeLevel = 18;
        postTelemetry(s);
      });
      break;
  }
  
  // Re-draw console on manual action
  drawConsole();
});

// Periodic ambient loop (every 2.5 seconds)
setInterval(() => {
  updateAmbientLevels();
  drawConsole();
}, 2500);

// Initial draw
drawConsole();
